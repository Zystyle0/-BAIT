const PROFILE_KEY = 'calorie_bank_profile'
const LOGS_KEY = 'calorie_bank_logs'
const SCHEDULE_KEY = 'calorie_bank_schedule'

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  return profile
}

export function loadLogs() {
  try {
    const raw = localStorage.getItem(LOGS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistLogs(logs) {
  logs.sort((a, b) => b.date.localeCompare(a.date))
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs))
  return logs
}

export function emptyDay(date) {
  return {
    date,
    calories_eaten: 0,
    protein_g: 0,
    weight: null,
    exercise_calories: 0,
    planned_flex: false,
    entries: [],
    updated_at: new Date().toISOString(),
  }
}

export function getLogForDate(date) {
  return loadLogs().find((l) => l.date === date) || null
}

export function recomputeDayTotals(log) {
  const entries = log.entries || []
  if (entries.length === 0) return log
  const food = entries.filter((e) => e.type === 'food')
  const activity = entries.filter((e) => e.type === 'activity')
  log.calories_eaten = food.reduce((sum, e) => sum + (Number(e.calories) || 0), 0)
  log.protein_g = food.reduce((sum, e) => sum + (Number(e.protein_g) || 0), 0)
  log.exercise_calories = activity.reduce((sum, e) => sum + (Number(e.calories) || 0), 0)
  return log
}

export function saveLog(entry) {
  const logs = loadLogs()
  const idx = logs.findIndex((l) => l.date === entry.date)
  const next = idx >= 0 ? { ...logs[idx], ...entry } : { ...emptyDay(entry.date), ...entry }
  if (Array.isArray(next.entries) && next.entries.length > 0) {
    recomputeDayTotals(next)
  }
  next.updated_at = new Date().toISOString()
  if (idx >= 0) logs[idx] = next
  else logs.push(next)
  return persistLogs(logs)
}

export function addEntry(date, entry) {
  const logs = loadLogs()
  const idx = logs.findIndex((l) => l.date === date)
  const log = idx >= 0 ? { ...logs[idx], entries: [...(logs[idx].entries || [])] } : emptyDay(date)
  log.entries.push({
    id: entry.id || crypto.randomUUID(),
    type: entry.type,
    name: entry.name?.trim() || (entry.type === 'activity' ? 'Activity' : 'Food'),
    calories: Number(entry.calories) || 0,
    protein_g: entry.protein_g === '' || entry.protein_g == null ? 0 : Number(entry.protein_g),
    created_at: entry.created_at || new Date().toISOString(),
  })
  recomputeDayTotals(log)
  log.updated_at = new Date().toISOString()
  if (idx >= 0) logs[idx] = log
  else logs.push(log)
  persistLogs(logs)
  return log
}

export function removeEntry(date, id) {
  const logs = loadLogs()
  const idx = logs.findIndex((l) => l.date === date)
  if (idx < 0) return null
  const log = { ...logs[idx], entries: (logs[idx].entries || []).filter((e) => e.id !== id) }
  recomputeDayTotals(log)
  log.updated_at = new Date().toISOString()
  logs[idx] = log
  persistLogs(logs)
  return log
}

export function loadSchedule() {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveSchedule(blocks) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(blocks))
  return blocks
}

export function blocksForWeekday(blocks, date = new Date()) {
  const weekday = new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
  return (blocks || []).filter((b) => b.day === weekday)
}

export function clearAllData() {
  localStorage.removeItem(PROFILE_KEY)
  localStorage.removeItem(LOGS_KEY)
  localStorage.removeItem(SCHEDULE_KEY)
}
