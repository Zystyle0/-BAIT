export default function DayRecapCard({ todayLog, dailyTarget, proteinTarget, bank, netCalories }) {
  const hour = new Date().getHours()
  if (hour < 19) return null

  const calories = netCalories != null ? Number(netCalories) : Number(todayLog?.calories_eaten) || 0
  const protein = Number(todayLog?.protein_g) || 0
  const weightLogged = todayLog?.weight != null && todayLog.weight !== ''

  let message = 'You showed up today. That consistency stacks.'
  if (!todayLog) {
    message = 'No log yet — if you still have time, a quick entry keeps your week clear. No pressure.'
  } else if (protein >= proteinTarget && calories <= dailyTarget * 1.05) {
    message = 'You hit your protein goal. Great recovery day.'
  } else if (calories > dailyTarget) {
    message =
      "Today used a bit more of your weekly bank — and that's okay. You're still on pace to adjust."
  } else if (bank.bankRemaining > 0) {
    message = 'You still have room left for the week and you are still on pace.'
  }

  return (
    <section className="cb-card border-duke-soft/40 p-5 animate-rise-delay-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">Day Complete</p>
      <h3 className="mt-1 font-display text-2xl text-ink">How today felt</h3>
      <div className="mt-3 grid gap-2 text-sm">
        <Row
          label="Calories"
          value={`${calories.toLocaleString()} / ${dailyTarget.toLocaleString()}`}
        />
        <Row label="Protein" value={`${protein}g / ${proteinTarget}g`} />
        <Row label="Weight logged" value={weightLogged ? 'Yes' : 'Not yet'} />
      </div>
      <p className="mt-4 rounded-2xl bg-duke-mist/70 px-3 py-3 text-sm leading-relaxed text-ink-soft">
        {message}
      </p>
    </section>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-duke-fog px-3 py-2">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold text-duke-deep">{value}</span>
    </div>
  )
}
