import { describe, expect, it } from 'vitest'
import {
  applyExerciseCredit,
  buildPlan,
  calcWeeklyBank,
  getLoggingStreak,
  getWeekStart,
  listRecentWeeks,
  netDayCalories,
  toDateKey,
} from './calculations'

describe('applyExerciseCredit', () => {
  it('does not add exercise when mode is none', () => {
    expect(applyExerciseCredit(400, 'none')).toBe(0)
  })

  it('credits half of activity calories', () => {
    expect(applyExerciseCredit(400, 'half')).toBe(200)
  })

  it('credits full and custom activity calories', () => {
    expect(applyExerciseCredit(400, 'full')).toBe(400)
    expect(applyExerciseCredit(400, 'custom')).toBe(400)
  })
})

describe('netDayCalories', () => {
  it('treats food as a withdrawal and credited activity as a deposit', () => {
    expect(netDayCalories({ calories_eaten: 2200, exercise_calories: 400 }, 'half')).toBe(2000)
  })

  it('can go below zero when activity exceeds food', () => {
    expect(netDayCalories({ calories_eaten: 200, exercise_calories: 400 }, 'full')).toBe(-200)
  })
})

describe('buildPlan', () => {
  it('builds a weekly calorie bank from Mifflin-St Jeor', () => {
    const plan = buildPlan({
      sex: 'male',
      age: 28,
      weight: 180,
      heightFt: 5,
      heightIn: 10,
      units: 'imperial',
      activity_level: 'moderately_active',
      goal_type: 'lose_fat',
      intensity: 'moderate',
    })
    expect(plan.weeklyBudget).toBe(plan.dailyTarget * 7)
    expect(plan.direction).toBe('deficit')
    expect(plan.dailyTarget).toBeLessThan(plan.maintenance)
    expect(plan.proteinTarget).toBeGreaterThan(0)
  })
})

describe('calcWeeklyBank', () => {
  it('uses net calories and reports activity credit', () => {
    const bank = calcWeeklyBank({
      dailyTarget: 2000,
      exerciseMode: 'full',
      today: new Date('2026-08-12T12:00:00'),
      weekStartsOn: 1,
      logs: [
        { date: '2026-08-10', calories_eaten: 1800, exercise_calories: 200 },
        { date: '2026-08-11', calories_eaten: 2200, exercise_calories: 0 },
      ],
    })
    expect(toDateKey(getWeekStart(new Date('2026-08-12T12:00:00'), 1))).toBe('2026-08-10')
    expect(bank.weeklyBudget).toBe(14000)
    expect(bank.weeklyConsumed).toBe(3800)
    expect(bank.weeklyFood).toBe(4000)
    expect(bank.weeklyExerciseCredit).toBe(200)
    expect(bank.bankRemaining).toBe(10200)
    expect(bank.daysPassed).toBe(2)
  })
})

describe('getLoggingStreak', () => {
  it('counts consecutive logged days ending today or yesterday', () => {
    const today = new Date('2026-08-15T15:00:00')
    const streak = getLoggingStreak(
      [
        { date: '2026-08-15', calories_eaten: 1900 },
        { date: '2026-08-14', calories_eaten: 2100 },
        { date: '2026-08-13', calories_eaten: 1800 },
        { date: '2026-08-11', calories_eaten: 2000 },
      ],
      today,
    )
    expect(streak).toBe(3)
  })
})

describe('listRecentWeeks', () => {
  it('returns the requested number of week snapshots', () => {
    const weeks = listRecentWeeks({
      logs: [],
      dailyTarget: 2000,
      today: new Date('2026-08-15T12:00:00'),
      count: 4,
    })
    expect(weeks).toHaveLength(4)
    expect(weeks[0].weeklyBudget).toBe(14000)
    expect(weeks[0].weekStart).not.toBe(weeks[1].weekStart)
  })
})
