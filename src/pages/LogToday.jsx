import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2, Utensils, Zap } from 'lucide-react'
import AppShell from '../components/AppShell'
import { applyExerciseCredit, buildPlan, toDateKey } from '../lib/calculations'
import { QUICK_ACTIVITIES, QUICK_FOODS } from '../lib/foods'
import { addEntry, getLogForDate, loadProfile, removeEntry, saveLog } from '../lib/storage'

function loadDay(date) {
  return getLogForDate(date) || {
    date,
    calories_eaten: 0,
    protein_g: 0,
    weight: '',
    exercise_calories: 0,
    planned_flex: false,
    entries: [],
  }
}

export default function LogToday() {
  const profile = loadProfile()
  const plan = useMemo(() => (profile ? buildPlan(profile) : null), [profile])
  const exerciseMode = profile?.exercise_calorie_mode || 'none'

  const [date, setDate] = useState(toDateKey(new Date()))
  const [day, setDay] = useState(() => loadDay(toDateKey(new Date())))
  const [food, setFood] = useState({ name: '', calories: '', protein_g: '' })
  const [activity, setActivity] = useState({ name: '', calories: '' })
  const [notice, setNotice] = useState('')

  const refresh = (nextDate = date) => {
    setDay(loadDay(nextDate))
  }

  const onDateChange = (next) => {
    setDate(next)
    setDay(loadDay(next))
    setNotice('')
  }

  const flash = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 1600)
  }

  const foodCalories = Number(day.calories_eaten) || 0
  const exerciseCalories = Number(day.exercise_calories) || 0
  const credit = applyExerciseCredit(exerciseCalories, exerciseMode)
  const net = foodCalories - credit
  const dailyTarget = plan?.dailyTarget || 0
  const remaining = dailyTarget - net
  const remainingPositive = remaining >= 0
  const usedPct = dailyTarget > 0 ? Math.min(100, Math.max(0, (net / dailyTarget) * 100)) : 0
  const entries = day.entries || []

  const submitFood = (preset) => {
    const payload = preset || food
    const calories = Number(payload.calories)
    if (!calories && calories !== 0) return
    const next = addEntry(date, {
      type: 'food',
      name: payload.name,
      calories,
      protein_g: payload.protein_g,
    })
    setDay(next)
    setFood({ name: '', calories: '', protein_g: '' })
    flash('Withdrawal posted to your bank')
  }

  const submitActivity = (preset) => {
    const payload = preset || activity
    const calories = Number(payload.calories)
    if (!calories && calories !== 0) return
    const next = addEntry(date, {
      type: 'activity',
      name: payload.name,
      calories,
    })
    setDay(next)
    setActivity({ name: '', calories: '' })
    flash(exerciseMode === 'none' ? 'Activity logged (not added to the bank)' : 'Deposit posted to your bank')
  }

  const onDelete = (id) => {
    const next = removeEntry(date, id)
    setDay(next || loadDay(date))
  }

  const saveMeta = (patch) => {
    const next = { ...day, ...patch, date }
    saveLog(next)
    refresh(date)
  }

  return (
    <AppShell>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-duke-mid">Daily ledger</p>
      <h1 className="font-display text-3xl text-ink">Log the day</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Food is a withdrawal. Activity is a deposit. The weekly bank updates instantly.
      </p>

      <label className="mt-4 block">
        <span className="cb-label">Date</span>
        <input className="cb-input" type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
      </label>

      <section className="cb-card mt-4 p-5 animate-rise">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">Today&apos;s balance</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className={`font-display text-4xl ${remainingPositive ? 'text-good' : 'text-warn'}`}>
              {Math.abs(Math.round(remaining)).toLocaleString()}
            </p>
            <p className="text-sm text-ink-muted">{remainingPositive ? 'kcal left today' : 'kcal over today'}</p>
          </div>
          <div className="text-right text-sm text-ink-soft">
            <p>Guide {dailyTarget.toLocaleString()} kcal</p>
            <p>Net {Math.round(net).toLocaleString()} used</p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-duke-mist">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              remainingPositive
                ? 'bg-gradient-to-r from-duke-soft via-duke-bright to-duke'
                : 'bg-gradient-to-r from-amber-400 to-orange-500'
            }`}
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <MiniStat label="Food out" value={foodCalories.toLocaleString()} />
          <MiniStat label="Activity in" value={`+${Math.round(credit)}`} />
          <MiniStat label="Protein" value={`${Number(day.protein_g) || 0}g`} />
        </div>
        {exerciseMode === 'none' && exerciseCalories > 0 ? (
          <p className="mt-3 text-xs text-ink-muted">
            {exerciseCalories.toLocaleString()} activity kcal logged, but Settings currently do not add
            exercise to the bank.
          </p>
        ) : null}
        {exerciseMode === 'half' && exerciseCalories > 0 ? (
          <p className="mt-3 text-xs text-ink-muted">50% of activity calories are credited as deposits.</p>
        ) : null}
      </section>

      {notice ? (
        <p className="mt-3 rounded-2xl bg-duke-mist/80 px-4 py-2 text-sm font-medium text-duke-deep">{notice}</p>
      ) : null}

      <section className="cb-card mt-4 space-y-3 p-5">
        <div className="flex items-center gap-2 text-duke">
          <Utensils size={18} />
          <h2 className="font-display text-xl text-ink">Withdrawal · food</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="cb-input col-span-2"
            placeholder="What did you eat?"
            value={food.name}
            onChange={(e) => setFood((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="cb-input"
            type="number"
            min="0"
            placeholder="Calories"
            value={food.calories}
            onChange={(e) => setFood((f) => ({ ...f, calories: e.target.value }))}
          />
          <input
            className="cb-input"
            type="number"
            min="0"
            placeholder="Protein g"
            value={food.protein_g}
            onChange={(e) => setFood((f) => ({ ...f, protein_g: e.target.value }))}
          />
        </div>
        <button type="button" className="cb-btn cb-btn-primary w-full" onClick={() => submitFood()}>
          <Minus size={16} /> Post food withdrawal
        </button>
        <div className="flex flex-wrap gap-2">
          {QUICK_FOODS.map((item) => (
            <button
              key={item.name}
              type="button"
              className="rounded-full bg-duke-fog px-3 py-1.5 text-xs font-medium text-duke-deep hover:bg-duke-mist"
              onClick={() => submitFood(item)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>

      <section className="cb-card mt-4 space-y-3 p-5">
        <div className="flex items-center gap-2 text-duke">
          <Zap size={18} />
          <h2 className="font-display text-xl text-ink">Deposit · activity</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="cb-input"
            placeholder="Walk, gym, ride…"
            value={activity.name}
            onChange={(e) => setActivity((a) => ({ ...a, name: e.target.value }))}
          />
          <input
            className="cb-input"
            type="number"
            min="0"
            placeholder="Calories"
            value={activity.calories}
            onChange={(e) => setActivity((a) => ({ ...a, calories: e.target.value }))}
          />
        </div>
        <button type="button" className="cb-btn cb-btn-ghost w-full" onClick={() => submitActivity()}>
          <Plus size={16} /> Post activity deposit
        </button>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIVITIES.map((item) => (
            <button
              key={item.name}
              type="button"
              className="rounded-full bg-duke-fog px-3 py-1.5 text-xs font-medium text-duke-deep hover:bg-duke-mist"
              onClick={() => submitActivity(item)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>

      <section className="cb-card mt-4 p-5">
        <h2 className="font-display text-xl text-ink">Ledger</h2>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No transactions yet. Add food or activity above.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-2xl bg-duke-fog px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{entry.name}</p>
                  <p className="text-xs text-ink-muted">
                    {entry.type === 'food' ? 'Withdrawal' : 'Deposit'}
                    {entry.type === 'food' && entry.protein_g ? ` · ${entry.protein_g}g protein` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-display text-lg ${entry.type === 'food' ? 'text-ink' : 'text-good'}`}>
                    {entry.type === 'food' ? '−' : '+'}
                    {Number(entry.calories).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    className="text-ink-muted hover:text-duke"
                    aria-label={`Remove ${entry.name}`}
                    onClick={() => onDelete(entry.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cb-card mt-4 space-y-3 p-5">
        <label className="block">
          <span className="cb-label">Body weight (optional)</span>
          <input
            className="cb-input"
            type="number"
            min="0"
            step="0.1"
            value={day.weight ?? ''}
            onChange={(e) => saveMeta({ weight: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </label>
        <label className="flex items-start gap-3 rounded-2xl bg-duke-fog px-3 py-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-duke"
            checked={Boolean(day.planned_flex)}
            onChange={(e) => saveMeta({ planned_flex: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-semibold text-ink">Planned flex meal</span>
            <span className="text-xs text-ink-muted">
              Intentional higher-cal day. Focus stays on the weekly bank.
            </span>
          </span>
        </label>
        <Link to="/dashboard" className="cb-btn cb-btn-ghost w-full">
          View weekly bank
        </Link>
      </section>
    </AppShell>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-duke-fog px-2 py-2">
      <p className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-0.5 font-display text-base text-duke-deep">{value}</p>
    </div>
  )
}
