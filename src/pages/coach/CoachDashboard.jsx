import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import HeatMap from '../../components/status/HeatMap'
import StatusCell from '../../components/status/StatusCell'
import {
  ROSTER_FILTERS,
  buildPriorities,
  filterSummaries,
  rosterStats,
  sortSummaries,
  summarizeClient,
} from '../../lib/coach'
import { getDemoCoach, getDemoRoster } from '../../lib/demoClients'
import { GOAL_LABELS } from '../../lib/calculations'

const SORTS = [
  { id: 'overall', label: 'Overall score' },
  { id: 'protein', label: 'Lowest protein' },
  { id: 'calories', label: 'Calorie adherence' },
  { id: 'weeklyBank', label: 'Weekly bank' },
  { id: 'activity', label: 'Activity' },
  { id: 'checkin', label: 'Last check-in' },
  { id: 'name', label: 'Name' },
]

export default function CoachDashboard() {
  const coach = getDemoCoach()
  const [query, setQuery] = useState('')
  const [filterId, setFilterId] = useState('all')
  const [sortKey, setSortKey] = useState('overall')
  const [selectedId, setSelectedId] = useState(null)

  const summaries = useMemo(() => {
    const today = new Date()
    return getDemoRoster(today).map((client) => summarizeClient(client, { today }))
  }, [])

  const stats = useMemo(() => rosterStats(summaries), [summaries])
  const priorities = useMemo(() => buildPriorities(summaries), [summaries])
  const visible = useMemo(
    () => sortSummaries(filterSummaries(summaries, filterId, query), sortKey),
    [summaries, filterId, query, sortKey],
  )
  const selected = summaries.find((s) => s.id === selectedId) || visible[0]

  return (
    <div className="coach-shell">
      <header className="coach-header">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-duke-mid">Coach dashboard</p>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">Who needs me?</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {coach.name} · {stats.count} demo clients · colors first, numbers on tap
          </p>
        </div>
        <dl className="coach-stats">
          <Stat label="On track" value={`${stats.greenPct}%`} hint={`${stats.green} clients`} />
          <Stat label="Watch" value={`${stats.yellowPct}%`} hint={`${stats.yellow} clients`} />
          <Stat label="Needs you" value={`${stats.hotPct}%`} hint={`${stats.hot} clients`} />
          <Stat label="Avg protein" value={`${stats.proteinAvg}%`} hint="adherence" />
        </dl>
      </header>

      <section className="cb-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">Today&apos;s priorities</p>
        <h2 className="font-display text-2xl text-ink">Start here</h2>
        <ul className="mt-4 space-y-2">
          {priorities.actionable.slice(0, 6).map((client) => (
            <li key={client.id}>
              <button
                type="button"
                className="priority-row"
                onClick={() => setSelectedId(client.id)}
              >
                <span className={`status-swatch tone-${client.overall.tone}`} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-semibold text-ink">{client.name}</span>
                  <span className="block truncate text-sm text-ink-soft">
                    {client.reasons[0]?.text || client.overall.explanation}
                  </span>
                </span>
                <span className="text-xs font-semibold text-ink-muted">{client.overall.status}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-muted">
          {priorities.restCount} other client{priorities.restCount === 1 ? '' : 's'} — no immediate action required.
        </p>
      </section>

      <section className="cb-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">Roster</p>
            <h2 className="font-display text-2xl text-ink">Client status</h2>
          </div>
          <label className="relative block w-full lg:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              className="cb-input pl-9"
              placeholder="Search client"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {ROSTER_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`chip ${filterId === filter.id ? 'is-active' : ''}`}
              onClick={() => setFilterId(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-sm text-ink-soft">
          Sort
          <select className="cb-input mt-1" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 hidden lg:block">
          <table className="coach-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Calories</th>
                <th>Protein</th>
                <th>Weekly Bank</th>
                <th>Weight</th>
                <th>Activity</th>
                <th>Overall</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((client) => (
                <tr
                  key={client.id}
                  className={selected?.id === client.id ? 'is-selected' : ''}
                  onClick={() => setSelectedId(client.id)}
                >
                  <td>
                    <div className="font-semibold text-ink">{client.name}</div>
                    <div className="text-xs text-ink-muted">
                      {GOAL_LABELS[client.goal_type] || client.goalLabel}
                      {client.daysSinceCheckIn >= 5 ? ` · ${client.daysSinceCheckIn}d silent` : ''}
                    </div>
                  </td>
                  <td><StatusCell status={client.calories} /></td>
                  <td><StatusCell status={client.protein} /></td>
                  <td><StatusCell status={client.weeklyBank} /></td>
                  <td><StatusCell status={client.weight} /></td>
                  <td><StatusCell status={client.activity} /></td>
                  <td>
                    <StatusCell status={client.overall} compact={false} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="mt-4 space-y-3 lg:hidden">
          {visible.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                className={`coach-card ${selected?.id === client.id ? 'is-selected' : ''}`}
                onClick={() => setSelectedId(client.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-left">
                    <p className="font-semibold text-ink">{client.name}</p>
                    <p className="text-xs text-ink-muted">{GOAL_LABELS[client.goal_type] || client.goalLabel}</p>
                  </div>
                  <StatusCell status={client.overall} compact={false} />
                </div>
                <div className="mt-3 flex justify-between">
                  <Mini metric="Cal" status={client.calories} />
                  <Mini metric="Pro" status={client.protein} />
                  <Mini metric="Bank" status={client.weeklyBank} />
                  <Mini metric="Wt" status={client.weight} />
                  <Mini metric="Act" status={client.activity} />
                </div>
              </button>
            </li>
          ))}
        </ul>

        {visible.length === 0 ? (
          <p className="mt-6 text-center text-sm text-ink-muted">No clients match this filter.</p>
        ) : null}
      </section>

      {selected ? (
        <section className="cb-card p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">Selected client</p>
              <h2 className="font-display text-2xl text-ink">{selected.name}</h2>
              <p className="text-sm text-ink-soft">
                {selected.overall.status} · {selected.overall.score ?? '—'} · {GOAL_LABELS[selected.goal_type]}
              </p>
            </div>
            <p className="max-w-md text-sm text-ink-muted">{selected.note}</p>
          </div>
          <HeatMap rows={selected.heatMap} />
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">
            One off-color day is normal variation. Priorities fire on trends — consecutive misses, a bank that cannot recover, or a quiet check-in streak.
          </p>
        </section>
      ) : null}
    </div>
  )
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="font-display text-2xl text-duke-deep">{value}</dd>
      <p className="text-xs text-ink-muted">{hint}</p>
    </div>
  )
}

function Mini({ metric, status }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <StatusCell status={status} size="sm" />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{metric}</span>
    </div>
  )
}
