import { useNavigate } from 'react-router-dom'
import { loadProfile } from '../lib/storage'
import { loadViewMode, saveViewMode } from '../lib/viewMode'

export default function DemoModeBar({ viewMode, onChange }) {
  const navigate = useNavigate()

  const setMode = (mode) => {
    saveViewMode(mode)
    onChange?.(mode)
    if (mode === 'coach') navigate('/coach')
    else if (loadProfile()) navigate('/dashboard')
    else navigate('/')
  }

  const mode = viewMode || loadViewMode()

  return (
    <div className="demo-bar">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4">
        <p className="truncate text-xs font-medium text-white/90">
          Demo mode · switch views without changing your personal log
        </p>
        <div className="flex rounded-full bg-white/15 p-0.5">
          <button
            type="button"
            className={`demo-toggle ${mode === 'client' ? 'is-active' : ''}`}
            onClick={() => setMode('client')}
          >
            Client view
          </button>
          <button
            type="button"
            className={`demo-toggle ${mode === 'coach' ? 'is-active' : ''}`}
            onClick={() => setMode('coach')}
          >
            Coach view
          </button>
        </div>
      </div>
    </div>
  )
}
