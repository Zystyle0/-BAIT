import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getWeekStart, toDateKey } from '../../lib/calculations'

export default function WeeklyBankChart({ logs, weeklyBudget, weekStartsOn = 1 }) {
  const weekStart = getWeekStart(new Date(), weekStartsOn)
  const data = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    const key = toDateKey(d)
    const dayLogs = logs.filter((l) => l.date === key)
    const consumed = dayLogs.reduce((s, l) => s + (Number(l.calories_eaten) || 0), 0)
    const prior = Array.from({ length: i + 1 }, (_, j) => {
      const dd = new Date(weekStart)
      dd.setDate(dd.getDate() + j)
      const k = toDateKey(dd)
      return logs
        .filter((l) => l.date === k)
        .reduce((s, l) => s + (Number(l.calories_eaten) || 0), 0)
    }).reduce((a, b) => a + b, 0)

    return {
      day: d.toLocaleDateString(undefined, { weekday: 'short' }),
      remaining: weeklyBudget - prior,
      consumed,
    }
  })

  return (
    <section className="cb-card p-5 animate-rise-delay-1">
      <h3 className="font-display text-xl text-ink">Bank remaining by day</h3>
      <p className="mb-3 text-sm text-ink-muted">Watch the week balance — not one snapshot.</p>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="bankFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4B8FD4" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#4B8FD4" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#d7e7f7" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: '#6b7f99', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#6b7f99', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid rgba(30,77,140,0.12)',
                boxShadow: '0 8px 20px rgba(18,53,104,0.08)',
              }}
            />
            <Area
              type="monotone"
              dataKey="remaining"
              stroke="#1E4D8C"
              strokeWidth={2.5}
              fill="url(#bankFill)"
              name="Bank remaining"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
