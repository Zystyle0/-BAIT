import { describe, expect, it } from 'vitest'
import { filterSummaries, rosterStats, summarizeClient } from './coach'
import { getDemoRoster } from './demoClients'

const TODAY = new Date('2026-08-15T15:00:00')

describe('demo roster', () => {
  it('builds 22 named clients with week logs', () => {
    const roster = getDemoRoster(TODAY)
    expect(roster).toHaveLength(22)
    expect(roster.every((c) => c.logs.length > 0)).toBe(true)
    expect(roster.map((c) => c.name)).toContain('Avery Chen')
    expect(roster.map((c) => c.archetype)).toContain('one_bad_day')
  })

  it('keeps an excellent client on track and a red client in needs-attention', () => {
    const roster = getDemoRoster(TODAY)
    const summaries = roster.map((c) => summarizeClient(c, { today: TODAY }))
    const avery = summaries.find((s) => s.id === 'avery')
    const nina = summaries.find((s) => s.id === 'nina')
    const harper = summaries.find((s) => s.id === 'harper')
    const marcus = summaries.find((s) => s.id === 'marcus')

    expect(avery.overall.score).toBeGreaterThanOrEqual(85)
    expect(nina.overall.score).toBeLessThan(75)
    expect(harper.calories.score).toBeGreaterThanOrEqual(80)
    expect(marcus.daysSinceCheckIn).toBeGreaterThanOrEqual(5)
    expect(avery.heatMap).toHaveLength(6)
    expect(avery.heatMap[0].cells).toHaveLength(7)
  })

  it('filters on-track vs needs attention', () => {
    const summaries = getDemoRoster(TODAY).map((c) => summarizeClient(c, { today: TODAY }))
    const onTrack = filterSummaries(summaries, 'on_track')
    const hot = filterSummaries(summaries, 'attention')
    const stale = filterSummaries(summaries, 'stale')
    const stats = rosterStats(summaries)

    expect(onTrack.length).toBeGreaterThan(0)
    expect(hot.length).toBeGreaterThan(0)
    expect(stale.some((s) => s.id === 'marcus')).toBe(true)
    expect(stats.count).toBe(22)
    expect(stats.green + stats.yellow + stats.hot).toBeLessThanOrEqual(22)
  })
})
