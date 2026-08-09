import BottomNav from './BottomNav'

export default function AppShell({ children, showNav = true }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-28 pt-6">
      {children}
      {showNav ? <BottomNav /> : null}
    </div>
  )
}
