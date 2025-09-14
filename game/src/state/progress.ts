export interface ProgressState {
  currentStage: number
  highestUnlocked: number
}

const KEY = 'limitless:progress:v1'

const DEFAULT: ProgressState = {
  currentStage: 1,
  highestUnlocked: 1,
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

// Tokens and pay-to-unlock flow removed for clarity and accessibility.

export function resetProgress() { saveProgress({ ...DEFAULT }) }
