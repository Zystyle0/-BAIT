export default function ProteinSummaryCard({
  dailyTarget,
  weeklyTarget,
  todayProtein,
  weekProtein,
  daysHit,
}) {
  const weeklyPct = Math.min(100, Math.round((weekProtein / Math.max(1, weeklyTarget)) * 100))
  let status = 'Focus on adding one reliable protein source at a time'
  if (weeklyPct >= 90) status = 'Excellent protein consistency'
  else if (weeklyPct >= 75) status = 'Strong week—keep building'
  else if (weeklyPct >= 50) status = 'Good start with room to improve'

  return (
    <section className="cb-card p-5 animate-rise-delay-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">Protein tracker</p>
      <h3 className="font-display text-xl text-ink">Recovery & lean mass</h3>
      <p className="mt-1 text-sm text-ink-muted">Separate from the calorie bank — on purpose.</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Mini label="Today" value={`${todayProtein}g`} sub={`/ ${dailyTarget}g`} />
        <Mini label="This week" value={`${weekProtein}g`} sub={`/ ${weeklyTarget}g`} />
        <Mini label="Weekly %" value={`${weeklyPct}%`} sub="complete" />
        <Mini label="Days hit" value={`${daysHit}`} sub="this week" />
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-duke-mist">
        <div
          className="h-full rounded-full bg-gradient-to-r from-duke-soft to-duke-mid"
          style={{ width: `${weeklyPct}%` }}
        />
      </div>
      <p className="mt-3 text-sm font-medium text-duke-deep">{status}</p>
    </section>
  )
}

function Mini({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-duke-fog px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-xl text-duke-deep">{value}</p>
      <p className="text-xs text-ink-muted">{sub}</p>
    </div>
  )
}
