import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { saveProfile, saveSchedule } from '../lib/storage'

const STEPS = ['Basics', 'Body', 'Goals', 'Schedule']

const empty = {
  name: '',
  age: '',
  sex: 'male',
  units: 'imperial',
  heightFt: '5',
  heightIn: '10',
  heightCm: '',
  weight: '',
  activity_level: 'moderately_active',
  goal_type: 'lose_fat',
  intensity: 'moderate',
  protein_preference: 'normal',
  tracking_style: 'flexible',
  week_starts_on: 1,
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(empty)
  const [blocks, setBlocks] = useState([])
  const [blockDraft, setBlockDraft] = useState({
    day: 'Monday',
    start_time: '12:00',
    end_time: '13:00',
    reason: 'Work',
  })

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const canNext = () => {
    if (step === 0) return Number(form.age) >= 13
    if (step === 1) {
      if (form.units === 'imperial') {
        return Number(form.weight) > 0 && Number(form.heightFt) > 0
      }
      return Number(form.weight) > 0 && Number(form.heightCm) > 0
    }
    return true
  }

  const finish = () => {
    const profile = {
      ...form,
      age: Number(form.age),
      weight: Number(form.weight),
      heightFt: Number(form.heightFt) || 0,
      heightIn: Number(form.heightIn) || 0,
      heightCm: Number(form.heightCm) || 0,
      created_at: new Date().toISOString(),
    }
    saveProfile(profile)
    saveSchedule(blocks)
    navigate('/plan')
  }

  return (
    <AppShell showNav={false}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-duke-mid">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="font-display text-3xl text-ink">{STEPS[step]}</h1>
        <div className="mt-3 flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-duke' : 'bg-duke-mist'}`}
            />
          ))}
        </div>
      </div>

      <div className="cb-card space-y-4 p-5 animate-rise">
        {step === 0 && (
          <>
            <Field label="Name (optional)">
              <input className="cb-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="What should we call you?" />
            </Field>
            <Field label="Age">
              <input className="cb-input" type="number" min="13" value={form.age} onChange={(e) => set('age', e.target.value)} />
            </Field>
            <Field label="Sex">
              <select className="cb-input" value={form.sex} onChange={(e) => set('sex', e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Units">
              <select className="cb-input" value={form.units} onChange={(e) => set('units', e.target.value)}>
                <option value="imperial">lb / ft</option>
                <option value="metric">kg / cm</option>
              </select>
            </Field>
            {form.units === 'imperial' ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Height (ft)">
                  <input className="cb-input" type="number" value={form.heightFt} onChange={(e) => set('heightFt', e.target.value)} />
                </Field>
                <Field label="Height (in)">
                  <input className="cb-input" type="number" value={form.heightIn} onChange={(e) => set('heightIn', e.target.value)} />
                </Field>
              </div>
            ) : (
              <Field label="Height (cm)">
                <input className="cb-input" type="number" value={form.heightCm} onChange={(e) => set('heightCm', e.target.value)} />
              </Field>
            )}
            <Field label={form.units === 'imperial' ? 'Weight (lb)' : 'Weight (kg)'}>
              <input className="cb-input" type="number" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
            </Field>
            <Field label="Activity level">
              <select className="cb-input" value={form.activity_level} onChange={(e) => set('activity_level', e.target.value)}>
                <option value="sedentary">Sedentary</option>
                <option value="lightly_active">Lightly active (1–3 days)</option>
                <option value="moderately_active">Moderately active (3–5 days)</option>
                <option value="very_active">Very active (6–7 days)</option>
                <option value="athlete">Athlete</option>
              </select>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Goal">
              <select className="cb-input" value={form.goal_type} onChange={(e) => set('goal_type', e.target.value)}>
                <option value="lose_fat">Lose fat</option>
                <option value="maintain">Maintain</option>
                <option value="gain_muscle">Gain muscle</option>
                <option value="recomp">Recomp</option>
              </select>
            </Field>
            <Field label="Intensity">
              <select className="cb-input" value={form.intensity} onChange={(e) => set('intensity', e.target.value)}>
                <option value="chill">Chill</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </Field>
            <Field label="Protein preference">
              <select className="cb-input" value={form.protein_preference} onChange={(e) => set('protein_preference', e.target.value)}>
                <option value="normal">Normal protein</option>
                <option value="high">High protein</option>
              </select>
            </Field>
            <Field label="Tracking style">
              <select className="cb-input" value={form.tracking_style} onChange={(e) => set('tracking_style', e.target.value)}>
                <option value="flexible">Flexible (weekly-focused)</option>
                <option value="strict">Strict (daily-focused)</option>
              </select>
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm text-ink-soft">
              Optional: mark times you can&apos;t eat or want workout windows. You can refine this later in Settings.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Day">
                <select className="cb-input" value={blockDraft.day} onChange={(e) => setBlockDraft((b) => ({ ...b, day: e.target.value }))}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Reason">
                <select className="cb-input" value={blockDraft.reason} onChange={(e) => setBlockDraft((b) => ({ ...b, reason: e.target.value }))}>
                  {['Can\'t Eat', 'Workout', 'Work', 'Sleep', 'Meeting'].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <Field label="Start">
                <input className="cb-input" type="time" value={blockDraft.start_time} onChange={(e) => setBlockDraft((b) => ({ ...b, start_time: e.target.value }))} />
              </Field>
              <Field label="End">
                <input className="cb-input" type="time" value={blockDraft.end_time} onChange={(e) => setBlockDraft((b) => ({ ...b, end_time: e.target.value }))} />
              </Field>
            </div>
            <button
              type="button"
              className="cb-btn cb-btn-ghost w-full"
              onClick={() => {
                setBlocks((prev) => [...prev, { ...blockDraft, id: crypto.randomUUID() }])
              }}
            >
              Add time block
            </button>
            {blocks.length > 0 && (
              <ul className="space-y-2">
                {blocks.map((b) => (
                  <li key={b.id} className="flex items-center justify-between rounded-xl bg-duke-fog px-3 py-2 text-sm">
                    <span>
                      {b.day} · {b.start_time}–{b.end_time} · {b.reason}
                    </span>
                    <button
                      type="button"
                      className="text-duke"
                      onClick={() => setBlocks((prev) => prev.filter((x) => x.id !== b.id))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="mt-5 flex gap-3">
        {step > 0 && (
          <button type="button" className="cb-btn cb-btn-ghost flex-1" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="cb-btn cb-btn-primary flex-1 disabled:opacity-40"
            disabled={!canNext()}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </button>
        ) : (
          <button type="button" className="cb-btn cb-btn-primary flex-1" onClick={finish}>
            Build My Plan
          </button>
        )}
      </div>
    </AppShell>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="cb-label">{label}</span>
      {children}
    </label>
  )
}
