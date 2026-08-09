import { Link, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { buildPlan, GOAL_LABELS } from '../lib/calculations'
import { loadProfile } from '../lib/storage'

export default function PlanResults() {
  const profile = loadProfile()
  if (!profile) return <Navigate to="/onboarding" replace />

  const plan = buildPlan(profile)
  const name = profile.name?.trim() || 'you'
  const diffLabel = plan.direction === 'deficit' ? 'Planned deficit' : plan.direction === 'surplus' ? 'Planned surplus' : 'Planned difference'

  return (
    <AppShell showNav={false}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-duke-mid">Your plan</p>
      <h1 className="font-display text-3xl text-ink">Built for {name}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {GOAL_LABELS[profile.goal_type]} · Daily numbers guide you. Weekly consistency wins.
      </p>

      <section className="cb-card mt-5 p-5 animate-rise">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">Maintenance calories</p>
        <div className="mt-2 flex items-end gap-3">
          <div>
            <p className="font-display text-4xl text-duke">{plan.maintenance.toLocaleString()}</p>
            <p className="text-sm text-ink-muted">kcal/day</p>
          </div>
          <div className="pb-1">
            <p className="font-display text-2xl text-duke-mid">{plan.weeklyMaintenance.toLocaleString()}</p>
            <p className="text-xs text-ink-muted">kcal/week</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          This is your estimated energy requirement for maintaining your current body weight. Consuming
          approximately this amount over the full week should keep your weight relatively stable, although
          normal scale fluctuations may still occur.
        </p>
      </section>

      <section className="cb-card mt-4 p-5 animate-rise-delay-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">Your goal plan</p>
        <div className="mt-2 flex items-end gap-3">
          <div>
            <p className="font-display text-4xl text-ink">{plan.dailyTarget.toLocaleString()}</p>
            <p className="text-sm text-ink-muted">kcal/day</p>
          </div>
          <div className="pb-1">
            <p className="font-display text-2xl text-duke-deep">{plan.weeklyBudget.toLocaleString()}</p>
            <p className="text-xs text-ink-muted">kcal/week</p>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <Row label={`${diffLabel} / day`} value={`${Math.abs(plan.dailyDiff).toLocaleString()} kcal`} />
          <Row label={`${diffLabel} / week`} value={`${Math.abs(plan.weeklyDiff).toLocaleString()} kcal`} />
          <Row
            label="Pound-equivalent landmark pace"
            value={plan.estimatedDaysPerLandmark ? `~every ${plan.estimatedDaysPerLandmark} days` : 'Maintenance pace'}
          />
          <Row label="Protein target" value={`${plan.proteinTarget}g / day`} />
        </div>
        {plan.estimatedDaysPerLandmark ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            At this planned pace, you are estimated to accumulate one pound-equivalent calorie landmark
            approximately every {plan.estimatedDaysPerLandmark} days. This is an energy estimate, not a
            guarantee of exact scale movement.
          </p>
        ) : null}
      </section>

      <div className="mt-6 flex flex-col gap-3">
        <Link to="/dashboard" className="cb-btn cb-btn-primary w-full">
          Go to Dashboard
        </Link>
        <Link to="/log" className="cb-btn cb-btn-ghost w-full">
          Log Today
        </Link>
      </div>
    </AppShell>
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
