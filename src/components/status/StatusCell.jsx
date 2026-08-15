import { useState } from 'react'

export default function StatusCell({ status, compact = true, size = 'md' }) {
  const [open, setOpen] = useState(false)
  if (!status) return <span className="status-swatch tone-missing" />

  const title = status.label || 'Status'
  return (
    <div
      role="button"
      tabIndex={0}
      className={`status-cell ${compact ? 'is-compact' : 'is-expanded'} size-${size}`}
      aria-label={`${title}: ${status.status || 'No data'}${status.score != null ? `, ${status.score}` : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        setOpen((v) => !v)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setOpen((v) => !v)
        }
      }}
      onBlur={() => setOpen(false)}
    >
      <span className={`status-swatch tone-${status.tone}`} />
      {!compact ? (
        <span className="status-copy">
          <span className="status-kicker">{title}</span>
          <span className="status-label">{status.status}</span>
        </span>
      ) : null}
      <span className={`status-pop ${open ? 'is-open' : ''}`} role="tooltip">
        <strong>{title}</strong>
        {status.score != null ? <span className="status-pop-score">{status.score} · {status.status}</span> : <span>{status.status}</span>}
        {status.value ? <span>Current: {status.value}</span> : null}
        {status.target ? <span>Goal: {status.target}</span> : null}
        {status.explanation ? <span className="status-pop-why">{status.explanation}</span> : null}
      </span>
    </div>
  )
}
