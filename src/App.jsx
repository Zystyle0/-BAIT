import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import PlanResults from './pages/PlanResults'
import Dashboard from './pages/Dashboard'
import LogToday from './pages/LogToday'
import Settings from './pages/Settings'
import Explore from './pages/Explore'
import Profile from './pages/Profile'
import CoachDashboard from './pages/coach/CoachDashboard'
import DemoModeBar from './components/DemoModeBar'
import { loadProfile } from './lib/storage'
import { loadViewMode } from './lib/viewMode'

function RequireProfile({ children }) {
  const profile = loadProfile()
  if (!profile) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  const [viewMode, setViewMode] = useState(loadViewMode)

  return (
    <>
      <DemoModeBar viewMode={viewMode} onChange={setViewMode} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/plan" element={<PlanResults />} />
        <Route
          path="/dashboard"
          element={
            <RequireProfile>
              <Dashboard />
            </RequireProfile>
          }
        />
        <Route
          path="/log"
          element={
            <RequireProfile>
              <LogToday />
            </RequireProfile>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireProfile>
              <Settings />
            </RequireProfile>
          }
        />
        <Route
          path="/explore"
          element={
            <RequireProfile>
              <Explore />
            </RequireProfile>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireProfile>
              <Profile />
            </RequireProfile>
          }
        />
        <Route path="/coach" element={<CoachDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
