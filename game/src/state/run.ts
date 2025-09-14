export interface RunBuild {
  level: number
  xp: number
  xpToNext: number
  speed: number
  attackCooldown: number
  projSpeed: number
  projCount: number
  hasMagnet: boolean
  magnetRadius: number
  hasBlast: boolean
  attackRadius: number
  hp: number
  // Upgrade counters for UI
  fireRateLv: number
  projLv: number
  speedLv: number
  magnetLv: number
  blastLv: number
}

const KEY = 'limitless:runstate:v1'

export function saveRunState(state: RunBuild) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
}

export function loadRunState(): RunBuild | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as RunBuild
  } catch { return null }
}

export function clearRunState() {
  try { localStorage.removeItem(KEY) } catch {}
}

