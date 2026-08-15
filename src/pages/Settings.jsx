import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { clearAllData, loadProfile, loadSchedule, saveProfile, saveSchedule } from '../lib/storage'

export default function Settings() {
  const navigate = useNavigate()
  const existing = loadProfile()
  if (!existing) return <Navigate to="/onboarding" replace />

  const [form, setForm] = useState(existing)
  const [blocks, setBlocks] = useState(loadSchedule())
  const [saved, setSaved] = useState(false)
  const [draft, setDraft] = useState({
    day: 'Monday',
    start_time: '18:00',
    end_time: '19:00',
    reason: "Can't Eat",
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const onSave = (e) => {
    e.preventDefault()
    saveProfile({
      ...form,
      age: Number(form.age),
      weight: Number(form.weight),
      heightFt: Number(form.heightFt) || 0,
      heightIn: Number(form.heightIn) || 0,
      heightCm: Number(form.heightCm) || 0,
    })
    saveSchedule(blocks)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <AppShell>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-duke-mid">Settings</p>
      <h1 className="font-display text-3xl text-ink">Your preferences</h1>
      <p className="mt-1 text-sm text-ink-soft">Tune goals, units, and when you eat or train.</p>

      <form onSubmit={onSave} className="cb-card mt-5 space-y-4 p-5">
        <label className="block">
          <span className="cb-label">Name</span>
          <input className="cb-input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="cb-label">Age</span>
            <input className="cb-input" type="number" value={form.age} onChange={(e) => set('age', e.target.value)} />
          </label>
          <label className="block">
            <span className="cb-label">Weight</span>
            <input className="cb-input" type="number" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="cb-label">Goal</span>
          <select className="cb-input" value={form.goal_type} onChange={(e) => set('goal_type', e.target.value)}>
            <option value="lose_fat">Lose fat</option>
            <option value="maintain">Maintain</option>
            <option value="gain_muscle">Gain muscle</option>
            <option value="recomp">Recomp</option>
          </select>
        </label>
        <label className="block">
          <span className="cb-label">Intensity</span>
          <select className="cb-input" value={form.intensity} onChange={(e) => set('intensity', e.target.value)}>
            <option value="chill">Chill</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </label>
        <label className="block">
          <span className="cb-label">Week starts on</span>
          <select
            className="cb-input"
            value={form.week_starts_on ?? 1}
            onChange={(e) => set('week_starts_on', Number(e.target.value))}
          >
            <option value={1}>Monday</option>
            <option value={0}>Sunday</option>
          </select>
        </label>
        <label className="block">
          <span className="cb-label">Exercise calories mode</span>
          <span className="mb-2 block text-xs text-ink-muted">
            Controls how activity deposits reduce the weekly bank.
          </span>
          <select
            className="cb-input"
            value={form.exercise_calorie_mode || 'none'}
            onChange={(e) => set('exercise_calorie_mode', e.target.value)}
          >
            <option value="none">Do not add exercise calories</option>
            <option value="half">Add 50%</option>
            <option value="full">Add all</option>
            <option value="custom">Custom (manual in log)</option>
          </select>
        </label>

        <div className="rounded-2xl border border-duke/10 bg-duke-fog p-3">
          <p className="text-sm font-semibold text-ink">Daily availability</p>
          <p className="mb-3 text-xs text-ink-muted">Can&apos;t-eat windows, workouts, and busy blocks.</p>
          <div className="grid grid-cols-2 gap-2">
            <select className="cb-input" value={draft.day} onChange={(e) => setDraft((d) => ({ ...d, day: e.target.value }))}>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <select className="cb-input" value={draft.reason} onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}>
              {["Can't Eat", 'Workout', 'Work', 'Sleep', 'Meeting'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <input className="cb-input" type="time" value={draft.start_time} onChange={(e) => setDraft((d) => ({ ...d, start_time: e.target.value }))} />
            <input className="cb-input" type="time" value={draft.end_time} onChange={(e) => setDraft((d) => ({ ...d, end_time: e.target.value }))} />
          </div>
          <button
            type="button"
            className="cb-btn cb-btn-ghost mt-2 w-full"
            onClick={() => setBlocks((prev) => [...prev, { ...draft, id: crypto.randomUUID() }])}
          >
            Add block
          </button>
          <ul className="mt-2 space-y-1">
            {blocks.map((b) => (
              <li key={b.id} className="flex justify-between rounded-lg bg-white px-2 py-1.5 text-xs">
                <span>
                  {b.day} {b.start_time}–{b.end_time} · {b.reason}
                </span>
                <button type="button" className="text-duke" onClick={() => setBlocks((p) => p.filter((x) => x.id !== b.id))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>

        <button type="submit" className="cb-btn cb-btn-primary w-full">
          {saved ? 'Saved' : 'Save changes'}
        </button>
        <Link to="/plan" className="cb-btn cb-btn-ghost w-full">
          Recalculate plan
        </Link>
        <Link to="/coach" className="cb-btn cb-btn-ghost w-full">
          Open coach demo
        </Link>
        <button
          type="button"
          className="w-full text-sm text-ink-muted underline"
          onClick={() => {
            if (confirm('Clear all local data and start over?')) {
              clearAllData()
              navigate('/')
            }
          }}
        >
          Reset app data
        </button>
      </form>
    </AppShell>
  )
}
