export const DEFAULT_MAX_HP = 6

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
  maxHp: number
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
    const parsed = JSON.parse(raw) as Partial<RunBuild>
    const maxHp = typeof parsed.maxHp === 'number' ? parsed.maxHp : DEFAULT_MAX_HP
    const hp = typeof parsed.hp === 'number' ? parsed.hp : maxHp
    return { ...parsed, maxHp, hp } as RunBuild
  } catch { return null }
}

export function clearRunState() {
  try { localStorage.removeItem(KEY) } catch {}
}

