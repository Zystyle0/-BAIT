import { calcWeeklyBank, getWeekStart, toDateKey } from './calculations'
import {
  DEFAULT_COACH_WEIGHTS,
  isNeedsAttention,
  makeStatus,
  overallLabelFromScore,
  scoreActivity,
  scoreCalories,
  scoreFromDailyStatuses,
  scoreOverall,
  scoreProtein,
  scoreSleep,
  scoreWeeklyBank,
  scoreWeightTrend,
  scoreWorkout,
} from './status'

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function dateKeysForWeek(today = new Date(), weekStartsOn = 1) {
  const start = getWeekStart(today, weekStartsOn)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return toDateKey(d)
  })
}

function logByDate(logs) {
  const map = new Map()
  for (const log of logs || []) map.set(log.date, log)
  return map
}

function dayIndexFromToday(today, weekStartsOn = 1) {
  const start = getWeekStart(today, weekStartsOn)
  return Math.floor((today - start) / (1000 * 60 * 60 * 24))
}

export function heatMapForClient(client, { today = new Date(), weekStartsOn = 1 } = {}) {
  const keys = dateKeysForWeek(today, weekStartsOn)
  const byDate = logByDate(client.logs)
  const rows = [
    { key: 'calories', label: 'Calories' },
    { key: 'protein', label: 'Protein' },
    { key: 'workout', label: 'Workout' },
    { key: 'weight', label: 'Weight' },
    { key: 'sleep', label: 'Sleep' },
    { key: 'activity', label: 'Activity' },
  ]

  return rows.map((row) => ({
    ...row,
    cells: keys.map((date, index) => {
      const log = byDate.get(date)
      const flex = index >= 5
      if (row.key === 'calories') {
        return log
          ? scoreCalories(log.calories_eaten, client.dailyTarget, { flex })
          : makeStatus({ missing: true, label: 'Calories', metric: 'calories' })
      }
      if (row.key === 'protein') {
        return log
          ? scoreProtein(log.protein_g, client.proteinTarget)
          : makeStatus({ missing: true, label: 'Protein', metric: 'protein' })
      }
      if (row.key === 'workout') {
        const planned = client.workoutDays?.includes(index) ?? false
        if (!log) return makeStatus({ missing: true, label: 'Workout', metric: 'workout' })
        return scoreWorkout(log.workout_done, planned)
      }
      if (row.key === 'weight') {
        if (log?.weight == null) return makeStatus({ missing: true, label: 'Weight', metric: 'weight' })
        return makeStatus({
          score: 92,
          label: 'Weight',
          metric: 'weight',
          value: `${Number(log.weight).toFixed(1)} lb`,
          target: 'Check-in logged',
          explanation: 'Weight check-in recorded.',
        })
      }
      if (row.key === 'sleep') {
        return log
          ? scoreSleep(log.sleep_hours, client.sleepTarget)
          : makeStatus({ missing: true, label: 'Sleep', metric: 'sleep' })
      }
      return log
        ? scoreActivity(log.steps, client.activityGoal)
        : makeStatus({ missing: true, label: 'Activity', metric: 'activity' })
    }),
  }))
}

export function summarizeClient(client, { today = new Date(), weights = DEFAULT_COACH_WEIGHTS } = {}) {
  const weekStartsOn = client.weekStartsOn ?? 1
  const keys = dateKeysForWeek(today, weekStartsOn)
  const byDate = logByDate(client.logs)
  const weekLogs = keys.map((date) => byDate.get(date)).filter(Boolean)
  const dayIndex = dayIndexFromToday(today, weekStartsOn)
  const daysLeft = Math.max(1, 7 - dayIndex)
  const flexWeekend = true

  const calorieDays = keys.map((date, i) => {
    const log = byDate.get(date)
    return log ? scoreCalories(log.calories_eaten, client.dailyTarget, { flex: flexWeekend && i >= 5 }) : null
  })
  const proteinDays = keys.map((date) => {
    const log = byDate.get(date)
    return log ? scoreProtein(log.protein_g, client.proteinTarget) : null
  })
  const workoutDays = keys.map((date, i) => {
    const log = byDate.get(date)
    const planned = client.workoutDays?.includes(i) ?? false
    if (!log) return null
    return scoreWorkout(log.workout_done, planned)
  })
  const activityDays = keys.map((date) => {
    const log = byDate.get(date)
    return log ? scoreActivity(log.steps, client.activityGoal) : null
  })
  const sleepDays = keys.map((date) => {
    const log = byDate.get(date)
    return log ? scoreSleep(log.sleep_hours, client.sleepTarget) : null
  })

  const bank = calcWeeklyBank({
    dailyTarget: client.dailyTarget,
    logs: client.logs || [],
    weekStartsOn,
    today,
    exerciseMode: client.exerciseMode || 'none',
  })

  const calories = scoreFromDailyStatuses(calorieDays)
  calories.label = 'Calories'
  calories.metric = 'calories'
  const latestCal = weekLogs.at(-1)
  if (latestCal) {
    calories.value = `${Math.round(latestCal.calories_eaten).toLocaleString()} kcal`
    calories.target = `${client.dailyTarget.toLocaleString()} kcal`
  }

  const protein = scoreFromDailyStatuses(proteinDays, { consecutivePoorDays: 4, poorBelow: 70 })
  protein.label = 'Protein'
  protein.metric = 'protein'
  if (weekLogs.length) {
    const avgP = weekLogs.reduce((s, l) => s + (Number(l.protein_g) || 0), 0) / weekLogs.length
    protein.value = `${Math.round(avgP)}g`
    protein.target = `${client.proteinTarget}g`
  }

  const weeklyBank = scoreWeeklyBank({
    weeklyBudget: bank.weeklyBudget,
    weeklyConsumed: bank.weeklyConsumed,
    dailyTarget: client.dailyTarget,
    dayIndex,
    daysLeft,
  })

  const activity = scoreFromDailyStatuses(activityDays)
  activity.label = 'Activity'
  activity.metric = 'activity'

  const sleep = scoreFromDailyStatuses(sleepDays)
  sleep.label = 'Sleep'
  sleep.metric = 'sleep'

  const workout = scoreFromDailyStatuses(workoutDays.filter(Boolean))
  workout.label = 'Workout'
  workout.metric = 'workout'

  const weightSeries = (client.logs || [])
    .filter((l) => l.weight != null)
    .slice(-8)
    .map((l) => Number(l.weight))
  const weight = scoreWeightTrend({
    weights: weightSeries,
    startWeight: client.startWeight || client.weight,
    goalType: client.goal_type,
  })

  const overall = scoreOverall(
    { weeklyBank, protein, workout, activity, sleep },
    weights,
  )
  overall.status = overallLabelFromScore(overall.score)

  const lastLog = [...(client.logs || [])].sort((a, b) => b.date.localeCompare(a.date))[0]
  const lastCheckIn = lastLog?.date || null
  const daysSinceCheckIn = lastCheckIn
    ? Math.floor((new Date(`${toDateKey(today)}T12:00:00`) - new Date(`${lastCheckIn}T12:00:00`)) / 86400000)
    : 99

  const heatMap = heatMapForClient(client, { today, weekStartsOn })
  const reasons = priorityReasons({
    client,
    proteinDays,
    weeklyBank,
    bank,
    daysSinceCheckIn,
    overall,
    protein,
  })

  return {
    id: client.id,
    name: client.name,
    goal_type: client.goal_type,
    goalLabel: client.goalLabel,
    dailyTarget: client.dailyTarget,
    proteinTarget: client.proteinTarget,
    weight: client.weight,
    archetype: client.archetype,
    note: client.coachNote,
    lastCheckIn,
    daysSinceCheckIn,
    bank,
    calories,
    protein,
    weeklyBank,
    weight,
    activity,
    workout,
    sleep,
    overall,
    heatMap,
    reasons,
    weekLogs,
  }
}

function consecutiveLowProtein(proteinDays) {
  let streak = 0
  let max = 0
  for (const day of proteinDays) {
    if (day?.score != null && day.score < 80) {
      streak += 1
      max = Math.max(max, streak)
    } else if (day?.score != null) {
      streak = 0
    }
  }
  return max
}

function priorityReasons({ client, proteinDays, weeklyBank, bank, daysSinceCheckIn, overall, protein }) {
  const reasons = []
  const expectedPace = client.dailyTarget * Math.max(1, 7 - bank.daysLeft)
  const behind = bank.weeklyConsumed - expectedPace

  if (daysSinceCheckIn >= 5) {
    reasons.push({
      severity: daysSinceCheckIn >= 6 ? 'attention' : 'watch',
      text: `No weight/check-in data for ${daysSinceCheckIn} days.`,
    })
  }

  const lowProteinStreak = consecutiveLowProtein(proteinDays)
  if (lowProteinStreak >= 4) {
    reasons.push({
      severity: 'critical',
      text: `Protein has been below 80% of target for ${lowProteinStreak} consecutive logged days.`,
    })
  } else if (protein.band === 'poor' || protein.band === 'critical') {
    reasons.push({
      severity: protein.band,
      text: `Weekly protein adherence is ${protein.score}% — ${protein.status.toLowerCase()}.`,
    })
  }

  if (bank.bankRemaining < -400) {
    reasons.push({
      severity: 'critical',
      text: `Weekly bank is ${Math.abs(Math.round(bank.bankRemaining)).toLocaleString()} calories over budget.`,
    })
  } else if (behind > client.dailyTarget * 1.15 && weeklyBank.score < 75) {
    reasons.push({
      severity: 'poor',
      text: `Weekly bank is ${Math.round(behind).toLocaleString()} calories ahead of expected pace.`,
    })
  }

  if (overall.band === 'critical' || overall.band === 'poor') {
    reasons.push({
      severity: overall.band,
      text: `Overall ${overall.status} (${overall.score}).`,
    })
  }

  return reasons
}

export function buildPriorities(summaries) {
  const actionable = summaries
    .filter((s) => s.reasons.length > 0 && (isNeedsAttention(s.overall) || s.daysSinceCheckIn >= 5 || s.reasons.some((r) => r.severity === 'critical' || r.severity === 'poor' || r.severity === 'attention')))
    .sort((a, b) => (a.overall.score ?? 0) - (b.overall.score ?? 0))

  const rest = summaries.length - actionable.length
  return { actionable, restCount: rest }
}

export const ROSTER_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'attention', label: 'Needs Attention' },
  { id: 'on_track', label: 'On Track' },
  { id: 'red', label: 'Red' },
  { id: 'orange', label: 'Orange' },
  { id: 'stale', label: 'No Recent Check-In' },
]

export function filterSummaries(summaries, filterId, query = '') {
  const q = query.trim().toLowerCase()
  return summaries.filter((s) => {
    if (q && !s.name.toLowerCase().includes(q)) return false
    if (filterId === 'attention') {
      return isNeedsAttention(s.overall) || s.reasons.length > 0
    }
    if (filterId === 'on_track') {
      return s.overall.band === 'elite' || s.overall.band === 'excellent' || s.overall.band === 'good'
    }
    if (filterId === 'red') return s.overall.band === 'poor' || s.overall.band === 'critical'
    if (filterId === 'orange') return s.overall.band === 'attention'
    if (filterId === 'stale') return s.daysSinceCheckIn >= 5
    return true
  })
}

export function sortSummaries(summaries, sortKey) {
  const copy = [...summaries]
  const scoreOf = (s, key) => s[key]?.score ?? -1
  copy.sort((a, b) => {
    if (sortKey === 'name') return a.name.localeCompare(b.name)
    if (sortKey === 'checkin') return (b.daysSinceCheckIn || 0) - (a.daysSinceCheckIn || 0)
    if (sortKey === 'protein') return scoreOf(a, 'protein') - scoreOf(b, 'protein')
    if (sortKey === 'calories') return scoreOf(a, 'calories') - scoreOf(b, 'calories')
    if (sortKey === 'weeklyBank') return scoreOf(a, 'weeklyBank') - scoreOf(b, 'weeklyBank')
    if (sortKey === 'activity') return scoreOf(a, 'activity') - scoreOf(b, 'activity')
    return (a.overall.score ?? 0) - (b.overall.score ?? 0)
  })
  return copy
}

export function rosterStats(summaries) {
  const n = summaries.length || 1
  const green = summaries.filter((s) => s.overall.band === 'elite' || s.overall.band === 'excellent' || s.overall.band === 'good').length
  const yellow = summaries.filter((s) => s.overall.band === 'watch').length
  const hot = summaries.filter((s) => isNeedsAttention(s.overall)).length
  const proteinAvg =
    summaries.filter((s) => s.protein.score != null).reduce((sum, s) => sum + s.protein.score, 0) /
    Math.max(1, summaries.filter((s) => s.protein.score != null).length)
  return {
    count: summaries.length,
    greenPct: Math.round((green / n) * 100),
    yellowPct: Math.round((yellow / n) * 100),
    hotPct: Math.round((hot / n) * 100),
    proteinAvg: Math.round(proteinAvg),
    green,
    yellow,
    hot,
  }
}
