export interface ProgressState {
  currentStage: number
  highestUnlocked: number
  tokens: number
}

const KEY = 'limitless:progress:v1'

const DEFAULT: ProgressState = {
  currentStage: 1,
  highestUnlocked: 1,
  tokens: 0,
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT, ...parsed }
  } catch {
    return { ...DEFAULT }
  }
}

export function saveProgress(state: ProgressState) {
  localStorage.setItem(KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent('progress:changed', { detail: state }))
}

export function setCurrentStage(stage: number) {
  const s = loadProgress()
  s.currentStage = Math.max(1, Math.floor(stage))
  if (s.currentStage > s.highestUnlocked) s.highestUnlocked = s.currentStage
  saveProgress(s)
}

export function addTokens(delta: number) {
  const s = loadProgress()
  s.tokens = Math.max(0, Math.floor(s.tokens + delta))
  saveProgress(s)
}

export function unlockNextStage(cost: number): boolean {
  const s = loadProgress()
  const next = s.highestUnlocked + 1
  if (s.tokens < cost) return false
  s.tokens -= cost
  s.highestUnlocked = next
  s.currentStage = next
  saveProgress(s)
  return true
}

export function resetProgress() { saveProgress({ ...DEFAULT }) }

