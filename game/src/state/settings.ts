export type MovementMode = 'click' | 'follow'

export interface SettingsState {
  movementMode: MovementMode
  highContrast: boolean
  textScale: number // percentage (e.g., 100)
  scanMode: boolean
  scanInterval: number // ms
  dwellEnabled: boolean
  dwellTime: number // ms
  followDeadzone: number // px
  followGain: number // 0.5–2.0 (multiplier)
  followMaxDist: number // px at which follow reaches full speed
  followCurve: number // 0.5–2.0, speed curve exponent
  clickArriveRadius: number // px
  faceTiltSensitivity: number // ~0.04 - 0.1
  faceNudgeDistance: number // px
  faceRepeatMs: number // ms
  difficulty: 'relaxed' | 'standard' | 'intense'
}

const KEY = 'limitless:settings:v1'

export const defaultSettings: SettingsState = {
  movementMode: 'click',
  highContrast: false,
  textScale: 100,
  scanMode: false,
  scanInterval: 1200,
  dwellEnabled: false,
  dwellTime: 900,
  followDeadzone: 16,
  followGain: 1.0,
  followMaxDist: 240,
  followCurve: 1.0,
  clickArriveRadius: 8,
  faceTiltSensitivity: 0.06,
  faceNudgeDistance: 160,
  faceRepeatMs: 300,
  difficulty: 'standard',
}

export function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaultSettings }
    const parsed = JSON.parse(raw) as Partial<SettingsState>
    return { ...defaultSettings, ...parsed }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(state: SettingsState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function applySettingsToDocument(state: SettingsState) {
  const root = document.documentElement
  root.style.setProperty('--textScale', `${state.textScale}%`)
  document.body.style.fontSize = `calc(16px * ${state.textScale} / 100)`
  document.body.classList.toggle('high-contrast', !!state.highContrast)
}

// Simple event bus via DOM CustomEvent
export function emitSettingsChanged(state: SettingsState) {
  window.dispatchEvent(new CustomEvent('settings:changed', { detail: state }))
}
