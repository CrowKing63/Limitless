export type StageReward = 'magnet' | 'blast'

const KEY = 'limitless:rewards:v1'

export function loadRewards(): StageReward[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function addReward(r: StageReward) {
  const arr = loadRewards()
  arr.push(r)
  localStorage.setItem(KEY, JSON.stringify(arr))
}

export function clearRewards() {
  localStorage.removeItem(KEY)
}
