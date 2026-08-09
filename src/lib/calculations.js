export const CALORIES_PER_LB_LANDMARK = 3500
export const SAFE_MIN_DAILY_CALORIES = 1200

const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  athlete: 1.9,
}

export function lbToKg(lb) {
  return lb / 2.20462
}

export function kgToLb(kg) {
  return kg * 2.20462
}

export function heightToCm({ heightFt = 0, heightIn = 0, heightCm = 0, unit = 'imperial' }) {
  if (unit === 'metric') return Number(heightCm) || 0
  const totalInches = Number(heightFt || 0) * 12 + Number(heightIn || 0)
  return totalInches * 2.54
}

export function weightToKg({ weight, unit = 'imperial' }) {
  const n = Number(weight) || 0
  return unit === 'metric' ? n : lbToKg(n)
}

/** Mifflin-St Jeor */
export function calcBmr({ sex, weightKg, heightCm, age }) {
  const w = Number(weightKg)
  const h = Number(heightCm)
  const a = Number(age)
  if (sex === 'female') {
    return 447.593 + 9.247 * w + 3.098 * h - 4.33 * a
  }
  return 88.362 + 13.397 * w + 4.799 * h - 5.677 * a
}

export function calcTdee(bmr, activityLevel) {
  return bmr * (ACTIVITY_FACTORS[activityLevel] || ACTIVITY_FACTORS.moderately_active)
}

export function goalMultiplier(goalType, intensity) {
  const map = {
    lose_fat: { chill: 0.9, moderate: 0.85, aggressive: 0.8 },
    maintain: { chill: 1, moderate: 1, aggressive: 1 },
    gain_muscle: { chill: 1.05, moderate: 1.1, aggressive: 1.15 },
    recomp: { chill: 0.95, moderate: 0.9, aggressive: 0.87 },
  }
  return map[goalType]?.[intensity] ?? 1
}

export function roundCalories(n) {
  return Math.round(n / 10) * 10
}

export function calcProteinTarget({ weightLb, goalType, proteinPreference = 'normal' }) {
  const high = proteinPreference === 'high'
  if (goalType === 'lose_fat' || goalType === 'recomp') {
    return Math.round(weightLb * (high ? 1.0 : 0.8))
  }
  return Math.round(weightLb * (high ? 0.9 : 0.75))
}

export function buildPlan(profile) {
  const unit = profile.units || 'imperial'
  const heightCm = heightToCm(profile)
  const weightKg = weightToKg({ weight: profile.weight, unit })
  const weightLb = unit === 'metric' ? kgToLb(weightKg) : Number(profile.weight)

  const bmr = calcBmr({
    sex: profile.sex,
    weightKg,
    heightCm,
    age: profile.age,
  })
  const tdee = calcTdee(bmr, profile.activity_level)
  const multiplier = goalMultiplier(profile.goal_type, profile.intensity)
  const dailyTarget = roundCalories(tdee * multiplier)
  const maintenance = roundCalories(tdee)
  const weeklyBudget = dailyTarget * 7
  const weeklyMaintenance = maintenance * 7
  const dailyDiff = dailyTarget - maintenance
  const weeklyDiff = dailyDiff * 7
  const absDailyDiff = Math.abs(dailyDiff)
  const estimatedDaysPerLandmark =
    absDailyDiff > 0 ? Math.round(CALORIES_PER_LB_LANDMARK / absDailyDiff) : null
  const proteinTarget = calcProteinTarget({
    weightLb,
    goalType: profile.goal_type,
    proteinPreference: profile.protein_preference,
  })

  return {
    bmr: Math.round(bmr),
    maintenance,
    weeklyMaintenance,
    dailyTarget,
    weeklyBudget,
    dailyDiff,
    weeklyDiff,
    estimatedDaysPerLandmark,
    proteinTarget,
    weeklyProteinTarget: proteinTarget * 7,
    direction: dailyDiff < 0 ? 'deficit' : dailyDiff > 0 ? 'surplus' : 'maintain',
  }
}

export function getWeekStart(date = new Date(), weekStartsOn = 1) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = weekStartsOn === 0 ? day : (day + 6) % 7
  d.setDate(d.getDate() - diff)
  return d
}

export function toDateKey(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function calcWeeklyBank({ dailyTarget, logs, weekStartsOn = 1, today = new Date() }) {
  const weekStart = getWeekStart(today, weekStartsOn)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const weekLogs = logs.filter((log) => {
    const d = new Date(log.date + 'T12:00:00')
    return d >= weekStart && d <= weekEnd
  })

  const weeklyBudget = dailyTarget * 7
  const weeklyConsumed = weekLogs.reduce((sum, l) => sum + (Number(l.calories_eaten) || 0), 0)
  const bankRemaining = weeklyBudget - weeklyConsumed

  const todayKey = toDateKey(today)
  const daysPassed = weekLogs.length
  const dayIndex = Math.floor((today - weekStart) / (1000 * 60 * 60 * 24))
  const daysLeft = Math.max(1, 7 - dayIndex)
  const avgPerDayRemaining = Math.round(bankRemaining / daysLeft)

  const proteinConsumed = weekLogs.reduce((sum, l) => sum + (Number(l.protein_g) || 0), 0)

  const adherence = Math.max(
    0,
    Math.round(100 - (Math.abs(weeklyConsumed - weeklyBudget) / Math.max(1, weeklyBudget)) * 100),
  )

  return {
    weekStart: toDateKey(weekStart),
    weekEnd: toDateKey(weekEnd),
    weeklyBudget,
    weeklyConsumed,
    bankRemaining,
    avgPerDayRemaining,
    daysLeft,
    daysPassed,
    proteinConsumed,
    adherence,
    todayKey,
    belowSafeMinimum: avgPerDayRemaining < SAFE_MIN_DAILY_CALORIES && bankRemaining > 0,
  }
}

export function getLoggingStreak(logs, today = new Date()) {
  const keys = new Set(logs.map((l) => l.date))
  let streak = 0
  const cursor = new Date(today)
  cursor.setHours(12, 0, 0, 0)

  // Allow missing today if checking early; start from yesterday if today not logged
  if (!keys.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  while (keys.has(toDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function calculateCalorieBank({
  maintenanceCalories,
  caloriesConsumed,
  previousBankBalance = 0,
}) {
  const dailyBalance = caloriesConsumed - maintenanceCalories
  const currentBankBalance = previousBankBalance + dailyBalance
  const poundEquivalent = Math.abs(currentBankBalance) / CALORIES_PER_LB_LANDMARK
  const progressToNextLandmark =
    (Math.abs(currentBankBalance) % CALORIES_PER_LB_LANDMARK) / CALORIES_PER_LB_LANDMARK

  return {
    dailyBalance,
    currentBankBalance,
    poundEquivalent: Number(poundEquivalent.toFixed(2)),
    progressPercent: Math.round(progressToNextLandmark * 100),
    direction: currentBankBalance < 0 ? 'deficit' : currentBankBalance > 0 ? 'surplus' : 'even',
  }
}

export function runningBankFromLogs({ logs, maintenance }) {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  let balance = 0
  for (const log of sorted) {
    balance += (Number(log.calories_eaten) || 0) - maintenance
  }
  return calculateCalorieBank({
    maintenanceCalories: maintenance,
    caloriesConsumed: 0,
    previousBankBalance: balance,
  })
}

export function coachMessage({ bank, todayCalories, dailyTarget }) {
  if (!todayCalories && todayCalories !== 0) {
    return 'Log today when you can. Weekly consistency is what moves the needle.'
  }
  if (bank.bankRemaining >= dailyTarget * bank.daysLeft * 0.9) {
    return "You're on track this week. Stay flexible — win the week."
  }
  if (bank.bankRemaining < 0) {
    return "You used more of your weekly bank. Adjust the rest of the week — you're still in control."
  }
  if (todayCalories > dailyTarget * 1.15) {
    return 'Higher day logged. One day never erases the week — your remaining average adjusts automatically.'
  }
  return 'Daily numbers are a guide. Weekly consistency is the goal.'
}

export const GOAL_LABELS = {
  lose_fat: 'Weight loss',
  maintain: 'Weight maintenance',
  gain_muscle: 'Muscle gain',
  recomp: 'Body recomposition',
}

export const ACTIVITY_LABELS = {
  sedentary: 'Sedentary',
  lightly_active: 'Lightly active',
  moderately_active: 'Moderately active',
  very_active: 'Very active',
  athlete: 'Athlete',
}
