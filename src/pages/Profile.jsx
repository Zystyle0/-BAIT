import { Link, Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { getLoggingStreak } from '../lib/calculations'
import { loadLogs, loadProfile } from '../lib/storage'

const MILESTONES = [
  { days: 7, label: 'Spark', emoji: '🔥', desc: 'One week of showing up.' },
  { days: 14, label: 'Kindler', emoji: '⚡', desc: 'Two weeks of stacked days.' },
  { days: 30, label: 'Golden', emoji: '🌟', desc: 'A full month of rhythm.' },
  { days: 90, label: 'Crystal', emoji: '💎', desc: 'A quarter of commitment.' },
  { days: 180, label: 'Platinum', emoji: '🛡️', desc: 'Half a year of proof.' },
  { days: 365, label: 'Legend', emoji: '👑', desc: 'A year of becoming you.' },
]

export default function Profile() {
  const profile = loadProfile()
  if (!profile) return <Navigate to="/onboarding" replace />
  const streak = getLoggingStreak(loadLogs())
  const earned = [...MILESTONES].reverse().find((m) => streak >= m.days)
  const next = MILESTONES.find((m) => streak < m.days)

  return (
    <AppShell>
      <Link to="/explore" className="text-sm font-medium text-duke">
        ← Explore
      </Link>
      <h1 className="mt-2 font-display text-3xl text-ink">
        {profile.name?.trim() || 'Your'} badge wall
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        You are the only person who can be you. These marks celebrate your consistency — not perfection.
      </p>

      <section className="cb-card mt-5 p-5 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-duke-soft to-duke text-4xl shadow-[0_12px_30px_rgba(30,77,140,0.35)]">
          {earned?.emoji || '🌱'}
        </div>
        <h2 className="mt-3 font-display text-2xl text-ink">
          {earned ? `${earned.label}` : 'Getting started'}
        </h2>
        <p className="text-sm text-ink-muted">{streak}-day logging streak</p>
        {next ? (
          <p className="mt-2 text-sm text-duke-deep">
            Next: {next.emoji} {next.label} at {next.days} days ({next.days - streak} to go)
          </p>
        ) : (
          <p className="mt-2 text-sm text-duke-deep">Legend status unlocked. Keep the chain alive.</p>
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {MILESTONES.map((m) => {
          const unlocked = streak >= m.days
          return (
            <div
              key={m.days}
              className={`cb-card p-4 ${unlocked ? '' : 'opacity-55 grayscale'}`}
            >
              <div className="text-2xl">{m.emoji}</div>
              <p className="mt-1 font-semibold text-ink">{m.label}</p>
              <p className="text-xs text-ink-muted">{m.days} days</p>
              <p className="mt-2 text-xs leading-snug text-ink-soft">{m.desc}</p>
            </div>
          )
        })}
      </div>
    </AppShell>
  )
}
