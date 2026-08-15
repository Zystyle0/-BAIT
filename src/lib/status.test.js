import { describe, expect, it } from 'vitest'
import {
  bandFromScore,
  scoreCalories,
  scoreFromDailyStatuses,
  scoreOverall,
  scoreProtein,
  scoreWeeklyBank,
} from './status'

describe('bandFromScore', () => {
  it('maps the published bands', () => {
    expect(bandFromScore(97).id).toBe('elite')
    expect(bandFromScore(92).id).toBe('excellent')
    expect(bandFromScore(86).id).toBe('good')
    expect(bandFromScore(80).id).toBe('watch')
    expect(bandFromScore(66).id).toBe('attention')
    expect(bandFromScore(50).id).toBe('poor')
    expect(bandFromScore(20).id).toBe('critical')
    expect(bandFromScore(null).id).toBe('missing')
  })
})

describe('scoreProtein', () => {
  it('treats hitting the goal as elite rather than raw overflow', () => {
    expect(scoreProtein(180, 180).band).toBe('elite')
    expect(scoreProtein(220, 180).score).toBeLessThanOrEqual(100)
  })

  it('uses percent of target when under', () => {
    const status = scoreProtein(118, 170)
    expect(status.score).toBe(69)
    expect(status.band).toBe('attention')
  })
})

describe('scoreCalories', () => {
  it('rewards being near the guide, not eating more', () => {
    expect(scoreCalories(2470, 2470).band).toBe('elite')
    expect(scoreCalories(3200, 2470).score).toBeLessThan(scoreCalories(2470, 2470).score)
    expect(scoreCalories(1600, 2470).score).toBeLessThan(80)
  })
})

describe('scoreWeeklyBank', () => {
  it('stays green when one higher day still fits the weekly buffer', () => {
    const status = scoreWeeklyBank({
      weeklyBudget: 17290,
      weeklyConsumed: 2470 * 5 + 600,
      dailyTarget: 2470,
      dayIndex: 5,
      daysLeft: 2,
    })
    expect(status.score).toBeGreaterThanOrEqual(85)
  })

  it('drops when the week is already over budget', () => {
    const status = scoreWeeklyBank({
      weeklyBudget: 17290,
      weeklyConsumed: 20000,
      dailyTarget: 2470,
      dayIndex: 5,
      daysLeft: 2,
    })
    expect(status.score).toBeLessThan(50)
  })
})

describe('scoreFromDailyStatuses', () => {
  it('does not punish one bad day inside a strong week', () => {
    const days = [
      scoreProtein(160, 160),
      scoreProtein(155, 160),
      scoreProtein(90, 160),
      scoreProtein(162, 160),
      scoreProtein(158, 160),
      scoreProtein(150, 160),
      scoreProtein(161, 160),
    ]
    const weekly = scoreFromDailyStatuses(days)
    expect(weekly.score).toBeGreaterThanOrEqual(85)
  })

  it('caps the score after four consecutive low-protein days', () => {
    const days = [
      scoreProtein(100, 160),
      scoreProtein(95, 160),
      scoreProtein(90, 160),
      scoreProtein(88, 160),
      scoreProtein(160, 160),
      scoreProtein(160, 160),
      scoreProtein(160, 160),
    ]
    const weekly = scoreFromDailyStatuses(days, { consecutivePoorDays: 4, poorBelow: 70 })
    expect(weekly.score).toBeLessThanOrEqual(58)
    expect(weekly.explanation).toMatch(/consecutive/)
  })
})

describe('scoreOverall', () => {
  it('renormalizes when a metric is missing instead of treating it as zero', () => {
    const withSleep = scoreOverall({
      weeklyBank: { score: 90 },
      protein: { score: 90 },
      workout: { score: 90 },
      activity: { score: 90 },
      sleep: { score: 90 },
    })
    const withoutSleep = scoreOverall({
      weeklyBank: { score: 90 },
      protein: { score: 90 },
      workout: { score: 90 },
      activity: { score: 90 },
      sleep: { score: null },
    })
    expect(withSleep.score).toBe(90)
    expect(withoutSleep.score).toBe(90)
  })
})
