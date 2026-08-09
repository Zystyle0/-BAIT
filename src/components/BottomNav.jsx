import { NavLink } from 'react-router-dom'
import { Home, Plus, Compass, Settings } from 'lucide-react'

const linkClass = ({ isActive }) =>
  `flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
    isActive ? 'text-duke' : 'text-ink-muted hover:text-duke-mid'
  }`

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-duke/10 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-end justify-around px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2">
        <NavLink to="/dashboard" className={linkClass}>
          <Home size={22} strokeWidth={2.2} />
          Home
        </NavLink>

        <NavLink
          to="/log"
          className="relative -top-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-duke-bright via-duke-mid to-duke text-white shadow-[0_10px_24px_rgba(30,77,140,0.45)] animate-pulse-soft"
          aria-label="Log today"
        >
          <Plus size={28} strokeWidth={2.5} />
        </NavLink>

        <NavLink to="/explore" className={linkClass}>
          <Compass size={22} strokeWidth={2.2} />
          Explore
        </NavLink>

        <NavLink to="/settings" className={linkClass}>
          <Settings size={22} strokeWidth={2.2} />
          Settings
        </NavLink>
      </div>
    </nav>
  )
}
