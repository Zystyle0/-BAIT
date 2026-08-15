import { Wallet } from 'lucide-react'

export default function WeeklyBankCard({ bank, dailyTarget }) {
  const pct = Math.min(100, Math.max(0, (bank.weeklyConsumed / Math.max(1, bank.weeklyBudget)) * 100))
  const remainingPositive = bank.bankRemaining >= 0

  return (
    <section className="cb-card p-5 animate-rise">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">Weekly Calorie Bank</p>
          <h2 className="font-display text-2xl text-ink">Your week at a glance</h2>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-duke-mist text-duke">
          <Wallet size={22} />
        </div>
      </div>

      <div className="mb-4 rounded-[1.35rem] bg-gradient-to-br from-duke-fog to-white px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Bank remaining</p>
        <p className={`mt-1 font-display text-4xl ${remainingPositive ? 'text-good' : 'text-warn'}`}>
          {Math.abs(Math.round(bank.bankRemaining)).toLocaleString()}
          <span className="ml-2 text-base font-sans font-medium text-ink-muted">
            {remainingPositive ? 'kcal left this week' : 'kcal over'}
          </span>
        </p>
        <p className="mt-1 text-sm text-ink-soft">Win the week, not every individual day.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Weekly budget" value={bank.weeklyBudget.toLocaleString()} unit="kcal" />
        <Stat label="Net used" value={Math.round(bank.weeklyConsumed).toLocaleString()} unit="kcal" />
        <Stat label="Avg / day left" value={bank.avgPerDayRemaining.toLocaleString()} unit="kcal" />
        <Stat label="Days remaining" value={String(bank.daysLeft)} unit={bank.daysLeft === 1 ? 'day' : 'days'} />
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-ink-muted">
          <span>Week progress</span>
          <span>{Math.round(pct)}% of budget used</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-duke-mist">
          <div
            className="h-full rounded-full bg-gradient-to-r from-duke-soft via-duke-bright to-duke transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          {bank.daysLeft} day{bank.daysLeft === 1 ? '' : 's'} left · daily guide ~{dailyTarget.toLocaleString()} kcal
        </p>
        {bank.weeklyExerciseCredit > 0 ? (
          <p className="mt-1 text-xs text-ink-muted">
            Food {Math.round(bank.weeklyFood).toLocaleString()} − activity credit{' '}
            {Math.round(bank.weeklyExerciseCredit).toLocaleString()}
          </p>
        ) : null}
      </div>
    </section>
  )
}

function Stat({ label, value, unit, accent }) {
  const color =
    accent === 'good' ? 'text-good' : accent === 'warn' ? 'text-warn' : 'text-duke-deep'
  return (
    <div className="rounded-2xl bg-duke-fog/80 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`mt-1 font-display text-xl ${color}`}>
        {value}
        <span className="ml-1 text-xs font-sans font-medium text-ink-muted">{unit}</span>
      </p>
    </div>
  )
}
