import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, HeartHandshake, TrendingUp } from 'lucide-react'

export default function Landing() {
  return (
    <div className="relative mx-auto min-h-dvh max-w-lg overflow-hidden px-5 pb-10 pt-10">
      <div className="pointer-events-none absolute -right-10 top-16 h-44 w-44 rounded-full bg-duke-soft/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 top-72 h-52 w-52 rounded-full bg-duke-mid/20 blur-3xl" />

      <header className="animate-rise">
        <p className="font-display text-4xl leading-none text-duke sm:text-5xl">Calorie Bank</p>
        <p className="mt-3 max-w-[18ch] font-display text-2xl leading-snug text-ink sm:text-3xl">
          Fit your life. You are never behind.
        </p>
        <p className="mt-3 max-w-sm text-base leading-relaxed text-ink-soft">
          Stop stressing daily calories. Win your week — with a flexible bank built around your schedule.
        </p>
      </header>

      <div className="relative mt-8 overflow-hidden rounded-[1.75rem] border border-duke/10 bg-gradient-to-br from-duke via-duke-mid to-duke-bright p-6 text-white shadow-[0_20px_50px_rgba(30,77,140,0.35)] animate-rise-delay-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">The star feature</p>
        <h2 className="mt-2 font-display text-3xl">Weekly Calorie Bank</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/85">
          Higher days, dinner-heavy days, busy days — they all fit when the week stays on track.
          Log food as withdrawals and activity as deposits.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
          <HeroStat label="Budget" value="Week" />
          <HeroStat label="Adjust" value="Daily" />
          <HeroStat label="Progress" value="Trend" />
        </div>
      </div>

      <ul className="mt-6 space-y-3 animate-rise-delay-2">
        <Bullet icon={CalendarDays} text="Personalized targets from your body + schedule" />
        <Bullet icon={TrendingUp} text="Trend-based progress — no daily panic" />
        <Bullet icon={HeartHandshake} text="Guilt-free tone. Adjust and continue." />
      </ul>

      <div className="mt-8 flex flex-col gap-3">
        <Link to="/onboarding" className="cb-btn cb-btn-primary w-full text-base">
          Get Started <ArrowRight size={18} />
        </Link>
        <Link to="/dashboard" className="cb-btn cb-btn-ghost w-full">
          I already have a plan
        </Link>
      </div>

      <p className="mt-8 text-center text-xs text-ink-muted">
        Flexible calories. Real progress.
      </p>
    </div>
  )
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/12 px-2 py-3 backdrop-blur-sm">
      <div className="font-display text-lg">{value}</div>
      <div className="text-white/70">{label}</div>
    </div>
  )
}

function Bullet({ icon: Icon, text }) {
  return (
    <li className="cb-card flex items-center gap-3 px-4 py-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-duke-mist text-duke">
        <Icon size={18} />
      </span>
      <span className="text-sm font-medium text-ink-soft">{text}</span>
    </li>
  )
}
