import { toDateKey } from './calculations'

function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

function mulberry32(seed) {
  return function rng() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function around(rng, base, spread) {
  return Math.round(base + (rng() * 2 - 1) * spread)
}

function weekdayIndex(date) {
  return (new Date(`${date}T12:00:00`).getDay() + 6) % 7
}

function dateOffset(today, daysBack) {
  const d = new Date(today)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - daysBack)
  return toDateKey(d)
}

const ROSTER = [
  {
    id: 'avery',
    name: 'Avery Chen',
    archetype: 'elite',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'female',
    age: 31,
    weight: 142,
    startWeight: 148,
    dailyTarget: 1950,
    proteinTarget: 130,
    activityGoal: 9000,
    sleepTarget: 7.5,
    workoutDays: [0, 2, 4],
    coachNote: 'Locked in. Keep the weekly bank flexible on dinner-out nights.',
  },
  {
    id: 'jordan',
    name: 'Jordan Blake',
    archetype: 'low_protein',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'male',
    age: 27,
    weight: 188,
    startWeight: 194,
    dailyTarget: 2300,
    proteinTarget: 175,
    activityGoal: 8000,
    sleepTarget: 7.5,
    workoutDays: [0, 2, 4, 5],
    coachNote: 'Calories are fine. Breakfast protein is the gap.',
  },
  {
    id: 'sam',
    name: 'Sam Rivera',
    archetype: 'weekend_calories',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'male',
    age: 34,
    weight: 201,
    startWeight: 206,
    dailyTarget: 2400,
    proteinTarget: 170,
    activityGoal: 8500,
    sleepTarget: 7,
    workoutDays: [0, 2, 4],
    coachNote: 'Weekdays are excellent. Saturday social meals are the pattern.',
  },
  {
    id: 'casey',
    name: 'Casey Nguyen',
    archetype: 'missing_checkins',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'female',
    age: 29,
    weight: 156,
    startWeight: 160,
    dailyTarget: 1850,
    proteinTarget: 125,
    activityGoal: 8000,
    sleepTarget: 7.5,
    workoutDays: [1, 3, 5],
    coachNote: 'Travels mid-week. Logging drops when on the road.',
  },
  {
    id: 'morgan',
    name: 'Morgan Patel',
    archetype: 'over_budget',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'female',
    age: 36,
    weight: 171,
    startWeight: 172,
    dailyTarget: 1750,
    proteinTarget: 140,
    activityGoal: 7500,
    sleepTarget: 7,
    workoutDays: [0, 2, 4],
    coachNote: 'Consistently over the weekly bank. Recalibrate portions before adding cardio.',
  },
  {
    id: 'riley',
    name: 'Riley Thompson',
    archetype: 'low_activity',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'male',
    age: 41,
    weight: 212,
    startWeight: 218,
    dailyTarget: 2200,
    proteinTarget: 170,
    activityGoal: 10000,
    sleepTarget: 7.5,
    workoutDays: [0, 3, 5],
    coachNote: 'Nutrition is solid. Steps are the bottleneck.',
  },
  {
    id: 'quinn',
    name: 'Quinn Morales',
    archetype: 'improving',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'female',
    age: 24,
    weight: 149,
    startWeight: 155,
    dailyTarget: 1900,
    proteinTarget: 125,
    activityGoal: 8500,
    sleepTarget: 8,
    workoutDays: [0, 2, 4],
    coachNote: 'Messy two weeks ago, much cleaner this week. Reinforce the win.',
  },
  {
    id: 'harper',
    name: 'Harper Diaz',
    archetype: 'one_bad_day',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'female',
    age: 33,
    weight: 138,
    startWeight: 141,
    dailyTarget: 1800,
    proteinTarget: 120,
    activityGoal: 9000,
    sleepTarget: 7.5,
    workoutDays: [0, 2, 4, 6],
    coachNote: 'One high Thursday. Weekly bank still on track — do not overcorrect.',
  },
  {
    id: 'noah',
    name: 'Noah Kim',
    archetype: 'sleep_issues',
    goal_type: 'recomp',
    goalLabel: 'Recomp',
    sex: 'male',
    age: 30,
    weight: 176,
    startWeight: 178,
    dailyTarget: 2500,
    proteinTarget: 165,
    activityGoal: 9000,
    sleepTarget: 8,
    workoutDays: [0, 2, 4, 5],
    coachNote: 'Training is there. Sleep is dragging recovery.',
  },
  {
    id: 'elena',
    name: 'Elena Vasquez',
    archetype: 'workout_skipper',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'female',
    age: 38,
    weight: 164,
    startWeight: 168,
    dailyTarget: 1700,
    proteinTarget: 130,
    activityGoal: 8000,
    sleepTarget: 7.5,
    workoutDays: [0, 2, 4],
    coachNote: 'Hits nutrition. Misses planned lifts when work runs late.',
  },
  {
    id: 'chris',
    name: 'Chris Walsh',
    archetype: 'watch_protein',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'male',
    age: 45,
    weight: 198,
    startWeight: 202,
    dailyTarget: 2100,
    proteinTarget: 160,
    activityGoal: 8000,
    sleepTarget: 7,
    workoutDays: [1, 3, 5],
    coachNote: 'Protein hovers 75–85%. A Greek yogurt at lunch would close it.',
  },
  {
    id: 'maya',
    name: 'Maya Singh',
    archetype: 'new_client',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'female',
    age: 26,
    weight: 152,
    startWeight: 152,
    dailyTarget: 1800,
    proteinTarget: 120,
    activityGoal: 8000,
    sleepTarget: 7.5,
    workoutDays: [0, 2, 4],
    coachNote: 'Started this week. Expect sparse history.',
  },
  {
    id: 'ben',
    name: 'Ben Okonkwo',
    archetype: 'fast_loss',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'male',
    age: 32,
    weight: 221,
    startWeight: 236,
    dailyTarget: 2400,
    proteinTarget: 190,
    activityGoal: 9000,
    sleepTarget: 7.5,
    workoutDays: [0, 2, 4, 5],
    coachNote: 'Scale is dropping faster than planned. Check food logging and recovery.',
  },
  {
    id: 'luna',
    name: 'Luna Park',
    archetype: 'muscle_gain',
    goal_type: 'gain_muscle',
    goalLabel: 'Muscle gain',
    sex: 'female',
    age: 28,
    weight: 132,
    startWeight: 129,
    dailyTarget: 2300,
    proteinTarget: 125,
    activityGoal: 8000,
    sleepTarget: 8,
    workoutDays: [0, 1, 3, 5],
    coachNote: 'Surplus and protein are on plan. Keep lifting frequency.',
  },
  {
    id: 'theo',
    name: 'Theo Laurent',
    archetype: 'inconsistent',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'male',
    age: 39,
    weight: 183,
    startWeight: 186,
    dailyTarget: 2200,
    proteinTarget: 155,
    activityGoal: 8500,
    sleepTarget: 7,
    workoutDays: [0, 2, 5],
    coachNote: 'Logs every other day. Consistency first, then precision.',
  },
  {
    id: 'jade',
    name: 'Jade Brooks',
    archetype: 'weekend_and_steps',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'female',
    age: 35,
    weight: 158,
    startWeight: 162,
    dailyTarget: 1750,
    proteinTarget: 130,
    activityGoal: 10000,
    sleepTarget: 7.5,
    workoutDays: [0, 2, 4],
    coachNote: 'Weekend calories plus low Saturday steps. Two levers, one conversation.',
  },
  {
    id: 'owen',
    name: 'Owen Fischer',
    archetype: 'elite_athlete',
    goal_type: 'recomp',
    goalLabel: 'Recomp',
    sex: 'male',
    age: 22,
    weight: 168,
    startWeight: 167,
    dailyTarget: 2800,
    proteinTarget: 180,
    activityGoal: 12000,
    sleepTarget: 8,
    workoutDays: [0, 1, 2, 4, 5],
    coachNote: 'High-output week. Bank flexibility is working.',
  },
  {
    id: 'priya',
    name: 'Priya Shah',
    archetype: 'recomp_on_track',
    goal_type: 'recomp',
    goalLabel: 'Recomp',
    sex: 'female',
    age: 30,
    weight: 140,
    startWeight: 141,
    dailyTarget: 2000,
    proteinTarget: 140,
    activityGoal: 9000,
    sleepTarget: 7.5,
    workoutDays: [0, 2, 4, 5],
    coachNote: 'Quietly excellent. Protein-first dinners are the habit to protect.',
  },
  {
    id: 'marcus',
    name: 'Marcus Lee',
    archetype: 'stale',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'male',
    age: 48,
    weight: 205,
    startWeight: 208,
    dailyTarget: 2100,
    proteinTarget: 160,
    activityGoal: 7000,
    sleepTarget: 7,
    workoutDays: [1, 3, 5],
    coachNote: 'No check-in for nearly a week. Light accountability ping.',
  },
  {
    id: 'sofia',
    name: 'Sofia Rossi',
    archetype: 'saturday_high_week_ok',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'female',
    age: 27,
    weight: 147,
    startWeight: 151,
    dailyTarget: 1850,
    proteinTarget: 125,
    activityGoal: 8500,
    sleepTarget: 7.5,
    workoutDays: [0, 2, 4],
    coachNote: 'Saturday is the highest calorie day and the weekly bank still closes.',
  },
  {
    id: 'alex',
    name: 'Alex Hart',
    archetype: 'watch_overall',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'male',
    age: 29,
    weight: 179,
    startWeight: 182,
    dailyTarget: 2250,
    proteinTarget: 160,
    activityGoal: 8500,
    sleepTarget: 7,
    workoutDays: [0, 2, 5],
    coachNote: 'Mostly fine. A little drift on protein and steps — watch, not alarm.',
  },
  {
    id: 'nina',
    name: 'Nina Cole',
    archetype: 'red_across',
    goal_type: 'lose_fat',
    goalLabel: 'Fat loss',
    sex: 'female',
    age: 42,
    weight: 174,
    startWeight: 173,
    dailyTarget: 1650,
    proteinTarget: 135,
    activityGoal: 8000,
    sleepTarget: 7.5,
    workoutDays: [0, 2, 4],
    coachNote: 'Calories, protein, and bank are all off. Needs a reset conversation this week.',
  },
]

function makeLog(date, values) {
  return {
    date,
    calories_eaten: values.calories,
    protein_g: values.protein,
    weight: values.weight ?? null,
    steps: values.steps,
    sleep_hours: values.sleep,
    workout_done: Boolean(values.workout),
    exercise_calories: values.exercise || 0,
    planned_flex: Boolean(values.flex),
  }
}

function generateLogs(spec, today) {
  const rng = mulberry32(hashString(spec.id))
  const logs = []
  const historyDays = spec.archetype === 'new_client' ? 3 : 21

  for (let back = historyDays - 1; back >= 0; back -= 1) {
    const date = dateOffset(today, back)
    const wd = weekdayIndex(date)
    const plannedWorkout = spec.workoutDays.includes(wd)
    const weekend = wd >= 5
    const thisWeek = back <= weekdayIndex(toDateKey(today))
    const weekNumber = Math.floor(back / 7)

    if (spec.archetype === 'missing_checkins' && (wd === 3 || wd === 4 || back <= 1)) continue
    if (spec.archetype === 'stale' && back <= 6) continue
    if (spec.archetype === 'inconsistent' && back % 2 === 1) continue
    if (spec.archetype === 'new_client' && back > 2) continue

    let cal = around(rng, spec.dailyTarget, spec.dailyTarget * 0.06)
    let protein = around(rng, spec.proteinTarget, 8)
    let steps = around(rng, spec.activityGoal, 600)
    let sleep = Math.round((spec.sleepTarget + (rng() * 0.6 - 0.3)) * 10) / 10
    let workout = plannedWorkout
    let weight = spec.startWeight + ((spec.weight - spec.startWeight) * (1 - back / 21))
    weight = Math.round(weight * 10) / 10
    let flex = false

    if (spec.archetype === 'elite' || spec.archetype === 'elite_athlete' || spec.archetype === 'recomp_on_track' || spec.archetype === 'muscle_gain') {
      protein = around(rng, spec.proteinTarget + 8, 6)
      steps = around(rng, spec.activityGoal + 400, 400)
      sleep = Math.round((spec.sleepTarget + rng() * 0.3) * 10) / 10
      workout = plannedWorkout
    }

    if (spec.archetype === 'low_protein' && thisWeek && wd <= 3) {
      protein = around(rng, spec.proteinTarget * 0.58, 8)
    } else if (spec.archetype === 'low_protein') {
      protein = around(rng, spec.proteinTarget * 0.78, 10)
    }

    if (spec.archetype === 'weekend_calories' && weekend) {
      cal = around(rng, spec.dailyTarget * 1.45, 120)
      flex = true
    }

    if (spec.archetype === 'over_budget') {
      cal = around(rng, spec.dailyTarget * 1.28, 80)
      protein = around(rng, spec.proteinTarget * 0.72, 10)
    }

    if (spec.archetype === 'low_activity') {
      steps = around(rng, spec.activityGoal * 0.42, 400)
    }

    if (spec.archetype === 'improving') {
      if (weekNumber >= 2) {
        cal = around(rng, spec.dailyTarget * 1.25, 90)
        protein = around(rng, spec.proteinTarget * 0.7, 10)
      } else {
        cal = around(rng, spec.dailyTarget, spec.dailyTarget * 0.05)
        protein = around(rng, spec.proteinTarget + 4, 6)
      }
    }

    if (spec.archetype === 'one_bad_day' && thisWeek && wd === 3) {
      cal = around(rng, spec.dailyTarget * 1.55, 80)
      flex = true
    }

    if (spec.archetype === 'sleep_issues') {
      sleep = Math.round((5.4 + rng() * 0.7) * 10) / 10
    }

    if (spec.archetype === 'workout_skipper' && plannedWorkout && thisWeek && wd !== 0) {
      workout = false
    }

    if (spec.archetype === 'watch_protein') {
      protein = around(rng, spec.proteinTarget * 0.8, 6)
    }

    if (spec.archetype === 'fast_loss') {
      cal = around(rng, spec.dailyTarget * 0.72, 70)
      weight = spec.startWeight - back * 0.7
    }

    if (spec.archetype === 'weekend_and_steps' && weekend) {
      cal = around(rng, spec.dailyTarget * 1.4, 90)
      steps = around(rng, spec.activityGoal * 0.45, 300)
      flex = true
    }

    if (spec.archetype === 'saturday_high_week_ok' && wd === 5) {
      cal = around(rng, spec.dailyTarget * 1.35, 60)
      flex = true
    } else if (spec.archetype === 'saturday_high_week_ok') {
      cal = around(rng, spec.dailyTarget * 0.92, 50)
    }

    if (spec.archetype === 'watch_overall') {
      protein = around(rng, spec.proteinTarget * 0.84, 6)
      steps = around(rng, spec.activityGoal * 0.82, 400)
    }

    if (spec.archetype === 'red_across') {
      cal = around(rng, spec.dailyTarget * 1.4, 90)
      protein = around(rng, spec.proteinTarget * 0.55, 8)
      steps = around(rng, spec.activityGoal * 0.4, 300)
      workout = false
      sleep = Math.round((5.6 + rng() * 0.5) * 10) / 10
    }

    const weighIn = wd === 0 || wd === 3 || back === 0
    logs.push(
      makeLog(date, {
        calories: Math.max(1100, cal),
        protein: Math.max(40, protein),
        steps: Math.max(1200, steps),
        sleep,
        workout,
        weight: weighIn ? Math.round(weight * 10) / 10 : null,
        flex,
        exercise: workout ? around(rng, 220, 40) : around(rng, 40, 20),
      }),
    )
  }

  return logs
}

export function getDemoRoster(today = new Date()) {
  return ROSTER.map((spec) => ({
    ...spec,
    logs: generateLogs(spec, today),
  }))
}

export function getDemoCoach() {
  return {
    id: 'demo-coach',
    name: 'Coach Taylor',
    email: 'coach@caloriebank.demo',
  }
}
