import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import WeeklyBankCard from '../components/dashboard/WeeklyBankCard'
import WeeklyBankChart from '../components/dashboard/WeeklyBankChart'
import StreakCard from '../components/dashboard/StreakCard'
import DayRecapCard from '../components/dashboard/DayRecapCard'
import ProteinSummaryCard from '../components/dashboard/ProteinSummaryCard'
import {
  applyExerciseCredit,
  buildPlan,
  calcWeeklyBank,
  coachMessage,
  getLoggingStreak,
  getWeekStart,
  netDayCalories,
  runningBankFromLogs,
  toDateKey,
} from '../lib/calculations'
import { blocksForWeekday, loadLogs, loadProfile, loadSchedule } from '../lib/storage'

const GREETINGS = [
  'You are your own standard.',
  'Anyone can do this — including you.',
  'Consistency beats perfection.',
  'You are never behind.',
  'Win the week, your way.',
]

function timeGreeting(name) {
  const h = new Date().getHours()
  const who = name?.trim() || 'champion'
  if (h < 12) return `Good morning, ${who}`
  if (h < 17) return `Good afternoon, ${who}`
  return `Good evening, ${who}`
}

export default function Dashboard() {
  const profile = loadProfile()
  if (!profile) return <Navigate to="/onboarding" replace />

  const logs = loadLogs()
  const schedule = loadSchedule()
  const exerciseMode = profile.exercise_calorie_mode || 'none'
  const plan = useMemo(() => buildPlan(profile), [profile])
  const bank = useMemo(
    () =>
      calcWeeklyBank({
        dailyTarget: plan.dailyTarget,
        logs,
        weekStartsOn: profile.week_starts_on ?? 1,
        exerciseMode,
      }),
    [plan.dailyTarget, logs, profile.week_starts_on, exerciseMode],
  )
  const streak = getLoggingStreak(logs)
  const todayKey = toDateKey(new Date())
  const todayLog = logs.find((l) => l.date === todayKey)
  const todayNet = netDayCalories(todayLog, exerciseMode)
  const todayCredit = applyExerciseCredit(todayLog?.exercise_calories, exerciseMode)
  const todayBlocks = blocksForWeekday(schedule)
  const todayEntries = todayLog?.entries || []
  const pound = runningBankFromLogs({ logs, maintenance: plan.maintenance })

  const weekStart = getWeekStart(new Date(), profile.week_starts_on ?? 1)
  const weekLogs = logs.filter((l) => {
    const d = new Date(l.date + 'T12:00:00')
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    return d >= weekStart && d <= end
  })
  const daysHitProtein = weekLogs.filter((l) => (Number(l.protein_g) || 0) >= plan.proteinTarget).length
  const quote = GREETINGS[new Date().getDate() % GREETINGS.length]
  const insight = coachMessage({
    bank,
    todayCalories: todayLog ? todayNet : null,
    dailyTarget: plan.dailyTarget,
  })

  return (
    <AppShell>
      <header className="animate-rise">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-duke-mid">Calorie Bank</p>
        <h1 className="font-display text-3xl text-ink">{timeGreeting(profile.name)}</h1>
        <p className="mt-1 text-sm text-ink-soft">{quote}</p>
      </header>

      <section className="cb-card mt-5 p-5 animate-rise-delay-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">Today&apos;s insight</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{insight}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-duke-fog px-3 py-2">
            <p className="text-ink-muted">Today</p>
            <p className="font-semibold text-duke-deep">
              {Math.round(todayNet).toLocaleString()} / {plan.dailyTarget.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-duke-fog px-3 py-2">
            <p className="text-ink-muted">Protein</p>
            <p className="font-semibold text-duke-deep">
              {(Number(todayLog?.protein_g) || 0)}g / {plan.proteinTarget}g
            </p>
          </div>
        </div>
      </section>

      <div className="mt-4 space-y-4">
        <WeeklyBankCard bank={bank} dailyTarget={plan.dailyTarget} />
        <WeeklyBankChart
          logs={logs}
          weeklyBudget={bank.weeklyBudget}
          weekStartsOn={profile.week_starts_on ?? 1}
          exerciseMode={exerciseMode}
        />

        {todayBlocks.length > 0 ? (
          <section className="cb-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">Today&apos;s schedule</p>
            <h3 className="font-display text-xl text-ink">Windows you set</h3>
            <ul className="mt-3 space-y-2">
              {todayBlocks.map((block) => (
                <li key={block.id} className="flex justify-between rounded-xl bg-duke-fog px-3 py-2 text-sm">
                  <span className="font-medium text-ink">{block.reason}</span>
                  <span className="text-ink-muted">
                    {block.start_time}–{block.end_time}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {todayEntries.length > 0 ? (
          <section className="cb-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">Today&apos;s ledger</p>
                <h3 className="font-display text-xl text-ink">Withdrawals & deposits</h3>
              </div>
              <Link to="/log" className="text-sm font-semibold text-duke">
                Edit →
              </Link>
            </div>
            <ul className="mt-3 space-y-2">
              {todayEntries.slice(0, 5).map((entry) => (
                <li key={entry.id} className="flex justify-between rounded-xl bg-duke-fog px-3 py-2 text-sm">
                  <span className="text-ink">{entry.name}</span>
                  <span className={entry.type === 'activity' ? 'font-semibold text-good' : 'font-semibold text-ink'}>
                    {entry.type === 'activity' ? '+' : '−'}
                    {Number(entry.calories).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
            {todayCredit > 0 ? (
              <p className="mt-3 text-xs text-ink-muted">
                Activity credit applied: {todayCredit.toLocaleString()} kcal
              </p>
            ) : null}
          </section>
        ) : null}
        <StreakCard streak={streak} />

        <section className="cb-card p-5 animate-rise-delay-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">Pound progress</p>
          <h3 className="font-display text-xl text-ink">Energy landmark</h3>
          <p className="mt-2 font-display text-3xl text-duke">
            {pound.currentBankBalance > 0 ? '+' : ''}
            {Math.round(pound.currentBankBalance).toLocaleString()}
            <span className="ml-2 text-base font-sans text-ink-muted">kcal bank</span>
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {pound.poundEquivalent} lb-equivalent · {pound.progressPercent}% to next landmark
          </p>
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            A 3,500-calorie landmark represents estimated energy progress. Actual scale weight may differ
            because of water, glycogen, digestion, and body composition.
          </p>
          {Math.abs(pound.currentBankBalance) / Math.max(1, logs.length) > 1500 && logs.length > 0 ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-warn">
              Your recorded pace is significantly faster than a typical planned deficit. Double-check food
              entries and activity. Extremely aggressive deficits may affect energy, recovery, and lean mass.
            </p>
          ) : null}
        </section>

        <ProteinSummaryCard
          dailyTarget={plan.proteinTarget}
          weeklyTarget={plan.weeklyProteinTarget}
          todayProtein={Number(todayLog?.protein_g) || 0}
          weekProtein={bank.proteinConsumed}
          daysHit={daysHitProtein}
        />

        <DayRecapCard
          todayLog={todayLog}
          dailyTarget={plan.dailyTarget}
          proteinTarget={plan.proteinTarget}
          bank={bank}
          netCalories={todayNet}
        />

        <section className="grid grid-cols-2 gap-3">
          <Link to="/explore" className="cb-card p-4 text-sm font-semibold text-duke">
            Explore more →
          </Link>
          <Link to="/plan" className="cb-card p-4 text-sm font-semibold text-duke">
            View plan →
          </Link>
        </section>
      </div>
    </AppShell>
  )
}
