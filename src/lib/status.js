/** Reusable 0–100 status scoring. Each metric has its own function; all return the same shape. */

export const STATUS_BANDS = [
  { id: 'elite', min: 95, label: 'Elite', tone: 'deep-green' },
  { id: 'excellent', min: 90, label: 'Excellent', tone: 'green' },
  { id: 'good', min: 85, label: 'Good', tone: 'light-green' },
  { id: 'watch', min: 75, label: 'Watch', tone: 'yellow' },
  { id: 'attention', min: 60, label: 'Needs Attention', tone: 'orange' },
  { id: 'poor', min: 40, label: 'Poor', tone: 'red' },
  { id: 'critical', min: 0, label: 'Critical', tone: 'deep-red' },
]

export const DEFAULT_COACH_WEIGHTS = {
  weeklyBank: 0.3,
  protein: 0.25,
  workout: 0.2,
  activity: 0.15,
  sleep: 0.1,
}

export const OVERALL_LABELS = [
  { min: 95, label: 'Locked In' },
  { min: 88, label: 'Great' },
  { min: 75, label: 'Watch' },
  { min: 60, label: 'Needs Attention' },
  { min: 0, label: 'Intervention' },
]

function clamp(n, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n))
}

export function bandFromScore(score) {
  if (score == null || Number.isNaN(Number(score))) {
    return { id: 'missing', min: null, label: 'No data', tone: 'missing' }
  }
  const s = clamp(Math.round(Number(score)))
  return STATUS_BANDS.find((b) => s >= b.min) || STATUS_BANDS[STATUS_BANDS.length - 1]
}

export function overallLabelFromScore(score) {
  if (score == null) return 'No data'
  const s = clamp(Math.round(Number(score)))
  return OVERALL_LABELS.find((b) => s >= b.min)?.label || 'Intervention'
}

export function makeStatus({
  score,
  label,
  value,
  target,
  explanation,
  metric,
  missing = false,
}) {
  if (missing || score == null) {
    return {
      score: null,
      band: 'missing',
      status: 'No data',
      tone: 'missing',
      label,
      value,
      target,
      explanation: explanation || 'No check-in for this metric yet.',
      metric,
    }
  }
  const clamped = clamp(Math.round(Number(score)))
  const band = bandFromScore(clamped)
  return {
    score: clamped,
    band: band.id,
    status: band.label,
    tone: band.tone,
    label,
    value,
    target,
    explanation,
    metric,
  }
}

/** Protein: percent of target. Extra protein does not inflate past elite. */
export function scoreProtein(actual, target) {
  if (actual == null || target == null || target <= 0) {
    return makeStatus({ missing: true, label: 'Protein', metric: 'protein' })
  }
  const pct = (Number(actual) / Number(target)) * 100
  let score = clamp(pct)
  if (Number(actual) >= Number(target)) score = Math.max(score, 95)
  else if (pct >= 90) score = Math.max(score, 90)
  else if (pct >= 85) score = Math.max(score, 85)
  return makeStatus({
    score,
    label: 'Protein',
    metric: 'protein',
    value: `${Math.round(actual)}g`,
    target: `${Math.round(target)}g`,
    explanation: `${Math.round(pct)}% of the ${Math.round(target)}g protein goal.`,
  })
}

/**
 * Calories: closeness to an appropriate range — more is not better.
 * Flex days (planned weekend) get a wider healthy band.
 */
export function scoreCalories(consumed, target, { flex = false } = {}) {
  if (consumed == null || target == null || target <= 0) {
    return makeStatus({ missing: true, label: 'Calories', metric: 'calories' })
  }
  const base = flex ? 0.16 : 0.1
  const dev = Math.abs(Number(consumed) - Number(target)) / Number(target)
  let score
  if (dev <= base * 0.5) score = 97
  else if (dev <= base) score = 91
  else if (dev <= base * 1.6) score = 84
  else if (dev <= base * 2.4) score = 72
  else if (dev <= base * 3.4) score = 54
  else score = 32

  const direction = Number(consumed) > Number(target) ? 'above' : 'below'
  return makeStatus({
    score,
    label: 'Calories',
    metric: 'calories',
    value: `${Math.round(consumed).toLocaleString()} kcal`,
    target: `${Math.round(target).toLocaleString()} kcal`,
    explanation: `${Math.round(dev * 100)}% ${direction} the ${Math.round(target).toLocaleString()} kcal guide${flex ? ' (flex day)' : ''}.`,
  })
}

/**
 * Weekly bank vs expected pace. One high day inside a 1-day buffer stays green.
 */
export function scoreWeeklyBank({
  weeklyBudget,
  weeklyConsumed,
  dailyTarget,
  dayIndex,
  daysLeft,
}) {
  if (weeklyBudget == null || weeklyConsumed == null || dailyTarget == null) {
    return makeStatus({ missing: true, label: 'Weekly Bank', metric: 'weeklyBank' })
  }
  const daysElapsed = Math.max(1, Math.min(7, (dayIndex ?? 0) + 1))
  const expectedUsed = dailyTarget * daysElapsed
  const buffer = dailyTarget
  const diff = weeklyConsumed - expectedUsed
  const remaining = weeklyBudget - weeklyConsumed
  const avgLeft = remaining / Math.max(1, daysLeft ?? 1)
  const absDiff = Math.abs(diff)

  let score
  if (weeklyConsumed > weeklyBudget) {
    const overPct = (weeklyConsumed - weeklyBudget) / weeklyBudget
    score = overPct > 0.12 ? 28 : overPct > 0.06 ? 42 : 58
  } else if (absDiff <= buffer * 0.35) score = 97
  else if (absDiff <= buffer) score = 90
  else if (absDiff <= buffer * 1.6) score = 82
  else if (absDiff <= buffer * 2.4) score = 70
  else if (absDiff <= buffer * 3.2) score = 56
  else score = 38

  if (remaining < 0 && daysLeft > 1) score = Math.min(score, 48)
  if (avgLeft > 0 && avgLeft < dailyTarget * 0.55 && daysLeft > 1) score = Math.min(score, 62)

  const pace =
    diff > buffer
      ? `${Math.round(diff).toLocaleString()} kcal ahead of expected pace`
      : diff < -buffer
        ? `${Math.round(-diff).toLocaleString()} kcal behind expected pace (under-eating)`
        : 'on expected weekly pace'

  return makeStatus({
    score,
    label: 'Weekly Bank',
    metric: 'weeklyBank',
    value: `${Math.round(remaining).toLocaleString()} left`,
    target: `${Math.round(weeklyBudget).toLocaleString()} kcal week`,
    explanation: `${pace}. ${Math.round(remaining).toLocaleString()} kcal remaining · ~${Math.round(avgLeft).toLocaleString()} / day left.`,
  })
}

export function scoreActivity(steps, goal) {
  if (steps == null || goal == null || goal <= 0) {
    return makeStatus({ missing: true, label: 'Activity', metric: 'activity' })
  }
  const pct = (Number(steps) / Number(goal)) * 100
  let score = clamp(pct)
  if (pct >= 100) score = Math.max(score, 95)
  else if (pct >= 90) score = Math.max(score, 90)
  return makeStatus({
    score,
    label: 'Activity',
    metric: 'activity',
    value: `${Math.round(steps).toLocaleString()} steps`,
    target: `${Math.round(goal).toLocaleString()} steps`,
    explanation: `${Math.round(pct)}% of the ${Math.round(goal).toLocaleString()} step goal.`,
  })
}

export function scoreSleep(hours, target) {
  if (hours == null || target == null || target <= 0) {
    return makeStatus({ missing: true, label: 'Sleep', metric: 'sleep' })
  }
  const delta = Math.abs(Number(hours) - Number(target))
  let score
  if (delta <= 0.35) score = 97
  else if (delta <= 0.75) score = 90
  else if (delta <= 1.1) score = 82
  else if (delta <= 1.6) score = 70
  else if (delta <= 2.2) score = 55
  else score = 36
  return makeStatus({
    score,
    label: 'Sleep',
    metric: 'sleep',
    value: `${Number(hours).toFixed(1)}h`,
    target: `${Number(target).toFixed(1)}h`,
    explanation: `${delta.toFixed(1)}h from the ${Number(target).toFixed(1)}h sleep target.`,
  })
}

export function scoreWorkout(done, planned = true) {
  if (done == null) {
    return makeStatus({ missing: true, label: 'Workout', metric: 'workout' })
  }
  if (!planned) {
    return makeStatus({
      score: 92,
      label: 'Workout',
      metric: 'workout',
      value: 'Rest',
      target: 'Rest day',
      explanation: 'Rest day — no session planned.',
    })
  }
  return makeStatus({
    score: done ? 96 : 48,
    label: 'Workout',
    metric: 'workout',
    value: done ? 'Completed' : 'Missed',
    target: 'Planned session',
    explanation: done ? 'Planned workout completed.' : 'Planned workout was not logged.',
  })
}

export function scoreWeightTrend({ weights, startWeight, goalType }) {
  const series = (weights || []).filter((w) => w != null)
  if (series.length < 2 || !startWeight) {
    return makeStatus({ missing: true, label: 'Weight', metric: 'weight' })
  }
  const latest = series[series.length - 1]
  const earlier = series[0]
  const weeklyChange = latest - earlier
  const pct = (weeklyChange / startWeight) * 100
  const losing = goalType === 'lose_fat' || goalType === 'recomp'
  const gaining = goalType === 'gain_muscle'

  let score = 80
  let explanation = `Change of ${weeklyChange >= 0 ? '+' : ''}${weeklyChange.toFixed(1)} lb over the sampled window.`

  if (losing) {
    if (pct <= -0.3 && pct >= -1.2) {
      score = 94
      explanation = `Down ${Math.abs(weeklyChange).toFixed(1)} lb — in a typical fat-loss range.`
    } else if (pct < -1.2 && pct >= -1.8) {
      score = 72
      explanation = `Down ${Math.abs(weeklyChange).toFixed(1)} lb — faster than a typical planned pace.`
    } else if (pct < -1.8) {
      score = 48
      explanation = `Down ${Math.abs(weeklyChange).toFixed(1)} lb — much faster than expected. Recheck logging.`
    } else if (pct > 0.4) {
      score = 62
      explanation = `Up ${weeklyChange.toFixed(1)} lb versus the start of this window.`
    } else {
      score = 78
      explanation = 'Weight is roughly stable this window.'
    }
  } else if (gaining) {
    if (pct >= 0.15 && pct <= 0.6) score = 93
    else if (pct > 0.6) score = 74
    else if (pct < -0.3) score = 60
    else score = 80
  }

  return makeStatus({
    score,
    label: 'Weight',
    metric: 'weight',
    value: `${latest.toFixed(1)} lb`,
    target: losing ? 'Downward trend' : gaining ? 'Upward trend' : 'Stable',
    explanation,
  })
}

/** Average available daily scores; consecutive weak days can cap the result. Isolated bad days do not. */
export function scoreFromDailyStatuses(dailyStatuses, { consecutivePoorDays = 4, poorBelow = 70 } = {}) {
  const present = (dailyStatuses || []).filter((s) => s && s.score != null)
  if (present.length === 0) return makeStatus({ missing: true })

  const avg = present.reduce((sum, s) => sum + s.score, 0) / present.length
  let streak = 0
  let maxStreak = 0
  for (const s of dailyStatuses || []) {
    if (s?.score != null && s.score < poorBelow) {
      streak += 1
      maxStreak = Math.max(maxStreak, streak)
    } else {
      streak = 0
    }
  }

  let score = avg
  let explanation = `Weekly average ${Math.round(avg)} across ${present.length} logged days.`
  if (maxStreak >= consecutivePoorDays) {
    score = Math.min(avg, 58)
    explanation = `${maxStreak} consecutive days below ${poorBelow}. Treated as a trend, not a one-off.`
  } else if (maxStreak === 1 && avg >= 85) {
    explanation = 'One softer day inside an otherwise strong week — weekly context stays green.'
  }

  return makeStatus({
    score,
    explanation,
    label: present[0]?.label,
    metric: present[0]?.metric,
  })
}

export function scoreOverall(parts, weights = DEFAULT_COACH_WEIGHTS) {
  const entries = Object.entries(weights)
  let totalW = 0
  let acc = 0
  for (const [key, weight] of entries) {
    const status = parts[key]
    if (!status || status.score == null) continue
    totalW += weight
    acc += status.score * weight
  }
  if (totalW === 0) return makeStatus({ missing: true, label: 'Overall', metric: 'overall' })
  const score = acc / totalW
  return makeStatus({
    score,
    label: 'Overall',
    metric: 'overall',
    value: String(Math.round(score)),
    target: '100',
    explanation: `${overallLabelFromScore(score)} · weighted from bank, protein, workouts, activity, and sleep.`,
  })
}

export function isNeedsAttention(status) {
  return status?.band === 'attention' || status?.band === 'poor' || status?.band === 'critical'
}

export function isOnTrack(status) {
  return status?.band === 'elite' || status?.band === 'excellent' || status?.band === 'good'
}

export function isWatchOrWorse(status) {
  return !isOnTrack(status) && status?.band !== 'missing'
}
