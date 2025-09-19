export const DEFAULT_MAX_HP = 6

export interface RunBuild {
  level: number
  xp: number
  xpToNext: number
  speed: number
  attackCooldown: number
  projSpeed: number
  projCount: number
  projectileDamage: number
  pierceTargets: number
  hasMagnet: boolean
  magnetRadius: number
  hasBlast: boolean
  attackRadius: number
  hp: number
  maxHp: number
  // Upgrade counters for UI
  fireRateLv: number
  projLv: number
  projSpeedLv: number
  damageLv: number
  pierceLv: number
  speedLv: number
  magnetLv: number
  blastLv: number
  staticFieldLv: number
  staticFieldCooldown: number
  staticFieldRadius: number
  staticFieldDamage: number
  droneLevel: number
  droneDamage: number
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
    const level = typeof parsed.level === 'number' ? parsed.level : 1
    const xp = typeof parsed.xp === 'number' ? parsed.xp : 0
    const xpToNext = typeof parsed.xpToNext === 'number' ? parsed.xpToNext : 5
    const speed = typeof parsed.speed === 'number' ? parsed.speed : 160
    const attackCooldown = typeof parsed.attackCooldown === 'number' ? parsed.attackCooldown : 800
    const projSpeed = typeof parsed.projSpeed === 'number' ? parsed.projSpeed : 300
    const projCount = typeof parsed.projCount === 'number' ? parsed.projCount : 1
    const projectileDamage = typeof parsed.projectileDamage === 'number' ? parsed.projectileDamage : 1
    const pierceTargets = typeof parsed.pierceTargets === 'number' ? parsed.pierceTargets : 0
    const hasMagnet = !!parsed.hasMagnet
    const magnetRadius = typeof parsed.magnetRadius === 'number' ? parsed.magnetRadius : (hasMagnet ? 120 : 0)
    const hasBlast = !!parsed.hasBlast
    const attackRadius = typeof parsed.attackRadius === 'number' ? parsed.attackRadius : 100
    const fireRateLv = typeof parsed.fireRateLv === 'number' ? parsed.fireRateLv : 0
    const projLv = typeof parsed.projLv === 'number' ? parsed.projLv : 0
    const projSpeedLv = typeof parsed.projSpeedLv === 'number' ? parsed.projSpeedLv : 0
    const damageLv = typeof parsed.damageLv === 'number' ? parsed.damageLv : Math.max(0, projectileDamage - 1)
    const pierceLv = typeof parsed.pierceLv === 'number' ? parsed.pierceLv : pierceTargets
    const speedLv = typeof parsed.speedLv === 'number' ? parsed.speedLv : 0
    const magnetLv = typeof parsed.magnetLv === 'number' ? parsed.magnetLv : (hasMagnet ? 1 : 0)
    const blastLv = typeof parsed.blastLv === 'number' ? parsed.blastLv : (hasBlast ? 1 : 0)
    const staticFieldLv = typeof parsed.staticFieldLv === 'number' ? parsed.staticFieldLv : 0
    const staticFieldCooldown = typeof parsed.staticFieldCooldown === 'number' ? parsed.staticFieldCooldown : 4500
    const staticFieldRadius = typeof parsed.staticFieldRadius === 'number' ? parsed.staticFieldRadius : 120
    const staticFieldDamage = typeof parsed.staticFieldDamage === 'number' ? parsed.staticFieldDamage : 1
    const droneLevel = typeof parsed.droneLevel === 'number' ? parsed.droneLevel : 0
    const droneDamage = typeof parsed.droneDamage === 'number' ? parsed.droneDamage : Math.min(5, 1 + Math.max(0, droneLevel - 3))
    return {
      level,
      xp,
      xpToNext,
      speed,
      attackCooldown,
      projSpeed,
      projCount,
      projectileDamage,
      pierceTargets,
      hasMagnet,
      magnetRadius,
      hasBlast,
      attackRadius,
      hp,
      maxHp,
      fireRateLv,
      projLv,
      projSpeedLv,
      damageLv,
      pierceLv,
      speedLv,
      magnetLv,
      blastLv,
      staticFieldLv,
      staticFieldCooldown,
      staticFieldRadius,
      staticFieldDamage,
      droneLevel,
      droneDamage,
    }
  } catch { return null }
}

export function clearRunState() {
  try { localStorage.removeItem(KEY) } catch {}
}

