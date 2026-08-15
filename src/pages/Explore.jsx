import { Link } from 'react-router-dom'
import { Award, CalendarRange, ChartColumnIncreasing, Target } from 'lucide-react'
import AppShell from '../components/AppShell'
import { buildPlan, listRecentWeeks, netDayCalories, toDateKey } from '../lib/calculations'
import { loadLogs, loadProfile } from '../lib/storage'

const LINKS = [
  { to: '/plan', title: 'Your Plan', desc: 'Targets, bank & landmark pace', icon: Target },
  { to: '/settings', title: 'Schedule', desc: 'Eating windows & workout blocks', icon: CalendarRange },
  { to: '/dashboard', title: 'Progress Hub', desc: 'Weekly bank at home', icon: ChartColumnIncreasing },
  { to: '/profile', title: 'Badges', desc: 'Milestones that feel earned', icon: Award },
]

function formatRange(start, end) {
  const a = new Date(`${start}T12:00:00`)
  const b = new Date(`${end}T12:00:00`)
  const opts = { month: 'short', day: 'numeric' }
  return `${a.toLocaleDateString(undefined, opts)} – ${b.toLocaleDateString(undefined, opts)}`
}

export default function Explore() {
  const profile = loadProfile()
  const logs = loadLogs()
  const name = profile?.name?.trim() || 'friend'
  const plan = profile ? buildPlan(profile) : null
  const exerciseMode = profile?.exercise_calorie_mode || 'none'
  const weeks = plan
    ? listRecentWeeks({
        logs,
        dailyTarget: plan.dailyTarget,
        weekStartsOn: profile.week_starts_on ?? 1,
        exerciseMode,
        count: 4,
      })
    : []

  const recentDays = [...logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)

  return (
    <AppShell>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-duke-mid">Explore</p>
      <h1 className="font-display text-3xl text-ink">History & tools</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Hey {name} — look at the weeks, not one day. Progress is an average.
      </p>

      {weeks.length > 0 ? (
        <section className="mt-5 space-y-3">
          <h2 className="font-display text-xl text-ink">Weekly bank history</h2>
          {weeks.map((week, index) => {
            const remainingPositive = week.bankRemaining >= 0
            return (
              <article key={week.weekStart} className="cb-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">
                      {index === 0 ? 'This week' : `${index} week${index === 1 ? '' : 's'} ago`}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">{formatRange(week.weekStart, week.weekEnd)}</p>
                  </div>
                  <p className={`font-display text-2xl ${remainingPositive ? 'text-good' : 'text-warn'}`}>
                    {remainingPositive ? '' : '−'}
                    {Math.abs(Math.round(week.bankRemaining)).toLocaleString()}
                  </p>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {remainingPositive ? 'kcal still in the bank' : 'kcal over the weekly budget'}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <Mini label="Budget" value={week.weeklyBudget.toLocaleString()} />
                  <Mini label="Net used" value={Math.round(week.weeklyConsumed).toLocaleString()} />
                  <Mini label="Days logged" value={String(week.daysPassed)} />
                </div>
              </article>
            )
          })}
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="font-display text-xl text-ink">Recent days</h2>
        {recentDays.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-duke-mist/70 px-4 py-3 text-sm text-duke-deep">
            No ledger yet. Log a meal and your history will show up here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentDays.map((log) => {
              const net = netDayCalories(log, exerciseMode)
              const target = plan?.dailyTarget || 0
              const left = target - net
              return (
                <li key={log.date}>
                  <Link to="/log" className="cb-card flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {new Date(`${log.date}T12:00:00`).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {(log.entries || []).length} transaction{(log.entries || []).length === 1 ? '' : 's'}
                        {log.date === toDateKey(new Date()) ? ' · today' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg text-duke-deep">{Math.round(net).toLocaleString()}</p>
                      <p className="text-xs text-ink-muted">
                        {left >= 0 ? `${Math.round(left)} left` : `${Math.abs(Math.round(left))} over`}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {LINKS.map(({ to, title, desc, icon: Icon }) => (
          <Link key={`${to}-${title}`} to={to} className="cb-card p-4 transition hover:-translate-y-0.5">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-duke-mist text-duke">
              <Icon size={18} />
            </span>
            <p className="font-semibold text-ink">{title}</p>
            <p className="mt-1 text-xs leading-snug text-ink-muted">{desc}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  )
}

function Mini({ label, value }) {
  return (
    <div className="rounded-xl bg-duke-fog px-2 py-2">
      <p className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-0.5 font-display text-base text-duke-deep">{value}</p>
    </div>
  )
}
