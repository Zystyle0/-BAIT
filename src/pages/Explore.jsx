import { Link } from 'react-router-dom'
import {
  Award,
  CalendarRange,
  ChartColumnIncreasing,
  Flame,
  Target,
  UserRound,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import { loadProfile } from '../lib/storage'

const LINKS = [
  { to: '/plan', title: 'Your Plan', desc: 'Targets, bank & landmark pace', icon: Target },
  { to: '/profile', title: 'Streak Badges', desc: 'Milestones that feel earned', icon: Flame },
  { to: '/settings', title: 'Schedule', desc: 'Eating windows & workout blocks', icon: CalendarRange },
  { to: '/dashboard', title: 'Progress Hub', desc: 'Weekly bank & protein at home', icon: ChartColumnIncreasing },
  { to: '/profile', title: 'Profile', desc: 'You — not a comparison', icon: UserRound },
  { to: '/plan', title: 'Goal Clarity', desc: 'Why your numbers exist', icon: Award },
]

const QUOTES = [
  'Structure gives you freedom.',
  'Progress is determined by averages.',
  'You temporarily store water. Fat change is a weekly pattern.',
  'Adjust and continue.',
]

export default function Explore() {
  const profile = loadProfile()
  const name = profile?.name?.trim() || 'friend'
  const quote = QUOTES[new Date().getDay() % QUOTES.length]

  return (
    <AppShell>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-duke-mid">Explore</p>
      <h1 className="font-display text-3xl text-ink">Everything in one place</h1>
      <p className="mt-2 rounded-2xl bg-duke-mist/70 px-4 py-3 text-sm text-duke-deep">
        Hey {name} — {quote}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {LINKS.map(({ to, title, desc, icon: Icon }, i) => (
          <Link
            key={`${to}-${title}`}
            to={to}
            className={`cb-card p-4 transition hover:-translate-y-0.5 ${i % 2 === 0 ? 'animate-rise' : 'animate-rise-delay-1'}`}
          >
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
