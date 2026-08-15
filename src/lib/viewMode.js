const KEY = 'calorie_bank_view_mode'

export function loadViewMode() {
  try {
    return localStorage.getItem(KEY) === 'coach' ? 'coach' : 'client'
  } catch {
    return 'client'
  }
}

export function saveViewMode(mode) {
  localStorage.setItem(KEY, mode === 'coach' ? 'coach' : 'client')
  return loadViewMode()
}
