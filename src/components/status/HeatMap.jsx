import { WEEKDAY_LABELS } from '../../lib/coach'
import StatusCell from './StatusCell'

export default function HeatMap({ rows, days = WEEKDAY_LABELS, title = 'This week' }) {
  return (
    <section className="heatmap">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-duke-mid">{title}</p>
          <h3 className="font-display text-xl text-ink">Weekly heat map</h3>
        </div>
        <p className="hidden text-xs text-ink-muted sm:block">Hover or tap a cell for the number.</p>
      </div>
      <div className="heatmap-scroll">
        <div
          className="heatmap-grid"
          style={{ gridTemplateColumns: `minmax(5.5rem,7rem) repeat(${days.length}, minmax(2.2rem,1fr))` }}
        >
          <div />
          {days.map((day) => (
            <div key={day} className="heatmap-day">
              {day}
            </div>
          ))}
          {rows.map((row) => (
            <HeatRow key={row.key} row={row} />
          ))}
        </div>
      </div>
    </section>
  )
}

function HeatRow({ row }) {
  return (
    <>
      <div className="heatmap-label">{row.label}</div>
      {row.cells.map((cell, i) => (
        <StatusCell key={`${row.key}-${i}`} status={cell} compact size="sm" />
      ))}
    </>
  )
}
