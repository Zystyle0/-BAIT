import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'

const MILESTONES = [
  { days: 7, label: 'Spark', emoji: '🔥' },
  { days: 14, label: 'Kindler', emoji: '⚡' },
  { days: 30, label: 'Golden', emoji: '🌟' },
  { days: 90, label: 'Crystal', emoji: '💎' },
  { days: 180, label: 'Platinum', emoji: '🛡️' },
  { days: 365, label: 'Legend', emoji: '👑' },
]

export default function StreakCard({ streak }) {
  const next = MILESTONES.find((m) => streak < m.days) || MILESTONES[MILESTONES.length - 1]
  const earned = [...MILESTONES].reverse().find((m) => streak >= m.days)
  const prevDays = earned?.days || 0
  const span = next.days - prevDays || 1
  const progress = Math.min(100, Math.round(((streak - prevDays) / span) * 100))

  return (
    <Link to="/profile" className="cb-card block p-5 transition hover:-translate-y-0.5 animate-rise-delay-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">Logging streak</p>
          <h3 className="mt-1 font-display text-2xl text-ink">
            <span className="mr-1 inline-flex text-duke">
              <Flame size={22} className="inline" />
            </span>
            {streak} day{streak === 1 ? '' : 's'}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            {earned
              ? `Current badge: ${earned.emoji} ${earned.label}`
              : 'Next badge unlocks at 7 days'}
          </p>
        </div>
        <div className="rounded-2xl bg-duke-mist px-3 py-2 text-center">
          <div className="text-xl">{next.emoji}</div>
          <div className="text-[11px] font-semibold text-duke">{next.days}d</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-ink-muted">
          <span>Next: {next.label}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-duke-mist">
          <div
            className="h-full rounded-full bg-gradient-to-r from-duke-bright to-duke"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-between gap-1">
        {MILESTONES.map((m) => {
          const unlocked = streak >= m.days
          return (
            <div
              key={m.days}
              className={`flex flex-1 flex-col items-center rounded-xl px-1 py-2 text-center text-[10px] ${
                unlocked ? 'bg-duke text-white' : 'bg-duke-fog text-ink-muted'
              }`}
              title={`${m.label} · ${m.days} days`}
            >
              <span className="text-sm">{m.emoji}</span>
              <span className="mt-0.5 font-semibold">{m.days}</span>
            </div>
          )
        })}
      </div>
    </Link>
  )
}
