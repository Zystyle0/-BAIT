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

export function saveLog(entry) {
  const logs = loadLogs()
  const idx = logs.findIndex((l) => l.date === entry.date)
  if (idx >= 0) logs[idx] = { ...logs[idx], ...entry }
  else logs.push(entry)
  logs.sort((a, b) => b.date.localeCompare(a.date))
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs))
  return logs
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

export function clearAllData() {
  localStorage.removeItem(PROFILE_KEY)
  localStorage.removeItem(LOGS_KEY)
  localStorage.removeItem(SCHEDULE_KEY)
}
