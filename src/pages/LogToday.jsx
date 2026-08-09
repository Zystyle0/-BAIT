import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { toDateKey } from '../lib/calculations'
import { loadLogs, saveLog } from '../lib/storage'

export default function LogToday() {
  const navigate = useNavigate()
  const existing = useMemo(() => {
    const today = toDateKey(new Date())
    return loadLogs().find((l) => l.date === today)
  }, [])

  const [form, setForm] = useState({
    date: existing?.date || toDateKey(new Date()),
    calories_eaten: existing?.calories_eaten ?? '',
    protein_g: existing?.protein_g ?? '',
    weight: existing?.weight ?? '',
    exercise_calories: existing?.exercise_calories ?? '',
    planned_flex: existing?.planned_flex ?? false,
  })
  const [saved, setSaved] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const onSave = (e) => {
    e.preventDefault()
    if (!form.calories_eaten && form.calories_eaten !== 0) return
    saveLog({
      ...form,
      calories_eaten: Number(form.calories_eaten),
      protein_g: form.protein_g === '' ? null : Number(form.protein_g),
      weight: form.weight === '' ? null : Number(form.weight),
      exercise_calories: form.exercise_calories === '' ? null : Number(form.exercise_calories),
      updated_at: new Date().toISOString(),
    })
    setSaved(true)
    setTimeout(() => navigate('/dashboard'), 650)
  }

  return (
    <AppShell>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-duke-mid">Daily log</p>
      <h1 className="font-display text-3xl text-ink">Log today</h1>
      <p className="mt-1 text-sm text-ink-soft">Fast entry. Weekly bank updates instantly.</p>

      <form onSubmit={onSave} className="cb-card mt-5 space-y-4 p-5 animate-rise">
        <label className="block">
          <span className="cb-label">Date</span>
          <input className="cb-input" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </label>
        <label className="block">
          <span className="cb-label">Calories eaten *</span>
          <input
            className="cb-input"
            type="number"
            required
            min="0"
            value={form.calories_eaten}
            onChange={(e) => set('calories_eaten', e.target.value)}
            placeholder="e.g. 2350"
          />
        </label>
        <label className="block">
          <span className="cb-label">Protein (g)</span>
          <input className="cb-input" type="number" min="0" value={form.protein_g} onChange={(e) => set('protein_g', e.target.value)} />
        </label>
        <label className="block">
          <span className="cb-label">Body weight (optional)</span>
          <input className="cb-input" type="number" min="0" step="0.1" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
        </label>
        <label className="block">
          <span className="cb-label">Exercise calories (optional)</span>
          <input
            className="cb-input"
            type="number"
            min="0"
            value={form.exercise_calories}
            onChange={(e) => set('exercise_calories', e.target.value)}
          />
        </label>

        <label className="flex items-start gap-3 rounded-2xl bg-duke-fog px-3 py-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-duke"
            checked={form.planned_flex}
            onChange={(e) => set('planned_flex', e.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold text-ink">Planned flex meal</span>
            <span className="text-xs text-ink-muted">
              Intentional higher-cal day. Focus stays on the weekly bank.
            </span>
          </span>
        </label>

        {form.planned_flex ? (
          <p className="rounded-xl bg-duke-mist/80 px-3 py-2 text-sm text-duke-deep">
            Intentional flex day logged. Focus stays on the weekly bank.
          </p>
        ) : null}

        <button type="submit" className="cb-btn cb-btn-primary w-full">
          {saved ? 'Saved — updating bank…' : 'Save Log'}
        </button>
        <Link to="/dashboard" className="cb-btn cb-btn-ghost w-full">
          View Dashboard
        </Link>
      </form>
    </AppShell>
  )
}
