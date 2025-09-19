import Phaser from 'phaser'
import { GAME_WIDTH, WORLD_WIDTH, WORLD_HEIGHT } from '../config'
import { VirtualInput } from '../../input/VirtualInput'
import { openLevelUp } from '../../ui/overlays'
import { loadProgress } from '../../state/progress'
import { loadRewards } from '../../state/rewards'
import { clearRunState, loadRunState, saveRunState, type RunBuild, DEFAULT_MAX_HP } from '../../state/run'

type Enemy = Phaser.Types.Physics.Arcade.ImageWithDynamicBody

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private inputLayer!: VirtualInput
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private enemies!: Phaser.Physics.Arcade.Group
  private xpOrbs!: Phaser.Physics.Arcade.Group
  private projectiles!: Phaser.Physics.Arcade.Group
  private enemyBullets!: Phaser.Physics.Arcade.Group
  private drones!: Phaser.Physics.Arcade.Group
  private uiText!: Phaser.GameObjects.Text
  private bgLayer?: Phaser.Tilemaps.TilemapLayer
  private floorPattern?: Phaser.GameObjects.RenderTexture

  private floorPalette: { even: number, odd: number, accent: number } = { even: 0x12162c, odd: 0x0d1122, accent: 0x1a1f35 }

  // Player stats
  private speed = 160
  private level = 1
  private xp = 0
  private xpToNext = 5
  private attackRadius = 100 // used for blast reward
  private attackCooldown = 800 // ms
  private attackEvt?: Phaser.Time.TimerEvent
  private inLevelUp = false
  private spawnEvt?: Phaser.Time.TimerEvent
  private enemySpeedMul = 1
  private hpMul = 1
  private bulletSpeedMul = 1
  private telegraphScale = 1
  private damageToPlayer = 1

  // Run & meta
  private runSecLeft = 90
  private runSecInit = 90
  private runTimerEvt?: Phaser.Time.TimerEvent
  private runOver = false
  private stage = 1
  private kills = 0
  private maxHp = DEFAULT_MAX_HP
  private hp = DEFAULT_MAX_HP
  private invulnUntil = 0
  private lastDamageAt = 0
  private regenAccumulator = 0
  private regenDelayMs = 2500
  private regenIntervalMs = 1000
  private practiceActive = false
  private projSpeed = 300
  private projCount = 1
  private projectileDamage = 1
  private pierceTargets = 0
  private hasMagnet = false
  private magnetRadius = 0
  private hasBlast = false
  private staticFieldLv = 0
  private staticFieldCooldown = 4500
  private staticFieldRadius = 100
  private staticFieldDamage = 1
  private nextStaticFieldAt = 0
  private readonly maxDrones = 3
  private droneLevel = 0
  private droneDamage = 1
  private droneOrbitRadius = 46
  private droneRotationSpeed = Math.PI / 1800
  private droneSprites: Phaser.Types.Physics.Arcade.ImageWithDynamicBody[] = []
  private isPractice = false
  private lastAim = 0
  private fireRateLv = 0
  private projLv = 0
  private projSpeedLv = 0
  private damageLv = 0
  private pierceLv = 0
  private speedLv = 0
  private magnetLv = 0
  private blastLv = 0
  private timeBar!: Phaser.GameObjects.Graphics
  private buildHUD!: Phaser.GameObjects.Text
  // Boss fields
  private boss?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private bossActive: boolean = false
  private bossSpawned: boolean = false
  private bossHp: number = 0
  private bossHpMax: number = 0
  private bossBar!: Phaser.GameObjects.Graphics
  private bossAnchorX: number = 0
  private bossAnchorY: number = 0

  constructor() { super('game') }

  init(data: any) {
    this.isPractice = !!data?.practice
  }

  create() {
    // Pixel-perfect camera
    this.cameras.main.setRoundPixels(true)
    // Reset per-run state to ensure clean restart between stages
    this.runOver = false
    this.inLevelUp = false
    this.kills = 0
    this.level = 1
    this.xp = 0
    this.xpToNext = 5
    this.maxHp = DEFAULT_MAX_HP
    this.hp = this.maxHp
    this.invulnUntil = 0
    this.lastDamageAt = this.time.now
    this.regenAccumulator = 0
    this.practiceActive = false
    // Base stats
    this.speed = 160
    this.attackRadius = 100
    this.attackCooldown = 800
    this.projSpeed = 300
    this.projCount = 1
    this.projectileDamage = 1
    this.pierceTargets = 0
    this.hasMagnet = false
    this.magnetRadius = 0
    this.hasBlast = false
    this.staticFieldLv = 0
    this.staticFieldCooldown = 4500
    this.staticFieldRadius = 100
    this.staticFieldDamage = 1
    this.nextStaticFieldAt = 0
    this.droneLevel = 0
    this.droneDamage = 1
    this.droneOrbitRadius = 46
    this.droneSprites = []
    this.fireRateLv = 0
    this.projLv = 0
    this.projSpeedLv = 0
    this.damageLv = 0
    this.pierceLv = 0
    this.speedLv = 0
    this.magnetLv = 0
    this.blastLv = 0
    if (this.spawnEvt) { this.spawnEvt.remove(false); this.spawnEvt = undefined }
    if (this.attackEvt) { this.attackEvt.remove(false); this.attackEvt = undefined }
    this.physics.world.isPaused = false
    this.input.enabled = true

    // Stage / meta
    const prog = loadProgress()
    this.stage = Math.max(1, (prog as any)?.currentStage || (prog as any)?.highestUnlocked || 1)
    // Short runs; extend slightly with stage
    this.runSecInit = Math.min(180, 90 + (this.stage - 1) * 15)
    this.runSecLeft = this.runSecInit
    // World bounds and camera follow for a larger map
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

    // Background tilemap (prefers large dynamic map if Tiled is too small)
    this.createBackground()
    this.applyStageTheme()

    // Player (16x16 base, use spritesheet if available)
    if (this.textures.exists('player_sheet')) {
      this.player = this.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'player_sheet', 0)
      if (this.anims.exists('player-down')) this.player.play('player-down')
      else if (this.anims.exists('player-walk')) this.player.play('player-walk')
    } else {
      this.player = this.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'player', 0)
    }
    // Smaller on-screen character to open up space
    this.player.setScale(1)
    this.player.setCircle(8)
    this.player.setCollideWorldBounds(true)
    if ((window as any)._settings?.highContrast) this.player.setTint(0xffbf00)

    // Camera tracks the player
    this.cameras.main.startFollow(this.player, true, 1, 1)

    // Input
    // Clear any residual input listeners from prior runs
    this.input.removeAllListeners()
    this.inputLayer = new VirtualInput(this)
    this.inputLayer.attach()
    // Ensure movement mode matches persisted settings
    this.inputLayer.setMode((window as any)._settings?.movementMode || 'click')
    this.cursors = this.input.keyboard!.createCursorKeys()

    // Voice commands
    window.addEventListener('voice:command', (e: Event) => {
      const detail = (e as CustomEvent).detail as any
      if (!detail) return
      if (detail.type === 'move') {
        const dist = (window as any)._settings?.faceNudgeDistance ?? 160
        this.inputLayer.nudgeTowards(detail.dir, dist, this.player.x, this.player.y)
      } else if (detail.type === 'stop') {
        this.inputLayer.stop()
      }
    })

    // Enemies + XP groups
    this.enemies = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image })
    this.xpOrbs = this.physics.add.group({ allowGravity: false })
    this.projectiles = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image })
    this.enemyBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image })
    this.drones = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, allowGravity: false })
    this.droneSprites = []
    for (let i = 0; i < 6; i++) this.spawnEnemy()

    // Damage on touch (with brief i-frames)
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.onHitEnemy(e as Enemy))

    // Collect XP
    this.physics.add.overlap(this.player, this.xpOrbs, (_p, orb) => {
      const o = orb as Phaser.Types.Physics.Arcade.ImageWithDynamicBody & { value?: number }
      this.xp += o.getData('value') ?? 1
      o.disableBody(true, true)
      this.playSfx(660)
      this.checkLevelUp()
      this.updateHUD2()
    })

    this.physics.add.overlap(this.projectiles, this.enemies, (proj, e) => this.onProjectileHitEnemy(proj as Phaser.Types.Physics.Arcade.ImageWithDynamicBody, e as Enemy))
    this.physics.add.overlap(this.drones, this.enemies, (drone, e) => this.onDroneHitEnemy(drone as Phaser.Types.Physics.Arcade.ImageWithDynamicBody, e as Enemy))
    // Enemy bullets hit player
    this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) => {
      const bb = b as Phaser.Types.Physics.Arcade.ImageWithDynamicBody
      bb.disableBody(true, true)
      this.onBulletHitPlayer()
    })

    // Difficulty presets + stage scaling
    const diff = (window as any)._settings?.difficulty || 'standard'
    let spawnDelay = 1500
    if (diff === 'relaxed') { spawnDelay = 2200; this.enemySpeedMul = 0.85; this.hpMul = 0.85; this.bulletSpeedMul = 0.9; this.telegraphScale = 1.2; this.damageToPlayer = 1 }
    else if (diff === 'intense') { spawnDelay = 1000; this.enemySpeedMul = 1.2; this.hpMul = 1.15; this.bulletSpeedMul = 1.15; this.telegraphScale = 0.85; this.damageToPlayer = 2 }
    else { this.hpMul = 1.0; this.bulletSpeedMul = 1.0; this.telegraphScale = 1.0; this.damageToPlayer = 1 }
    this.enemySpeedMul *= 1 + (this.stage - 1) * 0.08
    spawnDelay = Math.max(700, Math.round(spawnDelay - (this.stage - 1) * 120))
    // Spawn loop (track baseline/current for perf auto-tuning)
    this.baseSpawnDelay = spawnDelay
    this.setSpawnDelay(spawnDelay)

    // Tutorial / practice signals (bind once)
    window.addEventListener('tutorial:practice', () => {
      this.practiceActive = true
      if (this.spawnEvt) this.spawnEvt.paused = true
      this.clearEnemies()
      this.spawnPracticePack(6)
      this.showHint('연습 모드: 적 6마리 처치하면 본 게임 시작')
    })
    window.addEventListener('tutorial:play', () => {
      this.practiceActive = false
      if (this.spawnEvt) this.spawnEvt.paused = false
      localStorage.setItem('limitless:tutorialSeen', '1')
      this.showHint('게임 시작!')
    })

    // Short run timer (disabled in practice)
    if (!this.isPractice) {
      this.runTimerEvt = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
        if (this.runOver) return
        this.runSecLeft -= 1
        if (this.runSecLeft <= 0) this.endRun('time')
        this.updateHUD2()
      }})
    }

    // Auto-attack
    this.scheduleAttack()

    // Rewards
    const rewards = loadRewards()
    if (rewards.includes('magnet')) { this.hasMagnet = true; this.magnetRadius = 100 }
    if (rewards.includes('blast')) {
      this.hasBlast = true
      this.time.addEvent({ delay: 5000, loop: true, callback: () => this.radialBlast() })
    }

    // If continuing to next stage, apply previous run build
    this.applyRunStateIfAny()
    this.updateBuildHUD()

    // Click feedback
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const fx = this.add.circle(p.worldX, p.worldY, 6, 0xffffff, 0.3)
      this.tweens.add({ targets: fx, radius: 20, alpha: 0, duration: 200, onComplete: () => fx.destroy() })
      this.playSfx(880)
    })

    // Pause key
    this.input.keyboard!.on('keydown-ESC', () => this.openPause())
    this.input.keyboard!.on('keydown-P', () => this.openPause())

    // UI
    this.uiText = this.add.text(8, 8, '', { color: '#e7e7ef', fontSize: '14px', fontFamily: 'Galmuri11' }).setScrollFactor(0)
    // Improve readability with a thin outline and shadow
    this.uiText.setStroke('#000', 3).setShadow(0, 1, '#000', 2, true, true)
    // Time progress bar (top center)
    this.timeBar = this.add.graphics().setScrollFactor(0)
    this.drawTimeBar()
    // Build HUD (top-right)
    this.buildHUD = this.add.text(GAME_WIDTH - 8, 8, '', { color: '#b9b9c9', fontSize: '12px', align: 'right', fontFamily: 'Galmuri11' }).setOrigin(1, 0).setScrollFactor(0)
    this.buildHUD.setStroke('#000', 2).setShadow(0, 1, '#000', 2, true, true)
    this.updateHUD2()
    if (this.isPractice) {
      this.showHint('Practice: adjust left panel. Press Start Run in the sidebar when ready.')
      window.dispatchEvent(new CustomEvent('ui:practiceMode', { detail: { enabled: true } }))
      // Re-open settings after scene starts to ensure visibility on Safari
      this.time.delayedCall(50, () => window.dispatchEvent(new CustomEvent('ui:openSettings')))
      const onStart = () => {
        window.removeEventListener('ui:start_run', onStart as any)
        this.startRealRunNow()
      }
      window.addEventListener('ui:start_run', onStart as any)
      this.events.once('shutdown', () => window.removeEventListener('ui:start_run', onStart as any))
    } else {
      this.showHint('Click to move. Press Esc for Pause.')
      window.dispatchEvent(new CustomEvent('ui:practiceMode', { detail: { enabled: false } }))
    }
  }

  private spawnEnemy() {
    // Spawn at the edges
    const side = Phaser.Math.Between(0, 3)
    const margin = 30
    let x = 0, y = 0
    if (side === 0) { x = margin; y = Phaser.Math.Between(margin, WORLD_HEIGHT - margin) }
    else if (side === 1) { x = WORLD_WIDTH - margin; y = Phaser.Math.Between(margin, WORLD_HEIGHT - margin) }
    else if (side === 2) { y = margin; x = Phaser.Math.Between(margin, WORLD_WIDTH - margin) }
    else { y = WORLD_HEIGHT - margin; x = Phaser.Math.Between(margin, WORLD_WIDTH - margin) }

    let e = this.enemies.getFirstDead(false) as Enemy | null
    // Decide enemy type
    const et = this.pickEnemyType()
    const tex = et === 'stairs' ? 'enemy'
      : et === 'curb' ? 'enemy_curb'
      : et === 'turn' ? 'enemy_turn'
      : et === 'elev' ? 'enemy_elev'
      : et === 'barrier' ? 'enemy_barrier'
      : 'enemy_sign'
    if (!e) {
      e = this.enemies.create(x, y, tex) as Enemy
    } else {
      e.enableBody(true, x, y, true, true)
      ;(e as any).setTexture && (e as any).setTexture(tex)
    }
    e.setData('type', et)
    e.setData('hp', Math.max(1, Math.round(this.enemyBaseHp(et) * this.hpMul)))
    e.setCircle(7)
    const hc = (window as any)._settings?.highContrast
    if (hc && (e as any).setTint) (e as any).setTint(et === 'stairs' ? 0xff6b6b : et === 'curb' ? 0xd0d0d0 : 0xffbf00)
    const speed = Phaser.Math.Between(40, 80) * this.enemySpeedMul
    e.setData('spd', speed)
    if (et === 'stairs') {
      // Initial nudge toward current player position; tracking continues in update()
      const dx = this.player.x - x, dy = this.player.y - y
      const len = Math.hypot(dx, dy) || 1
      e.setVelocity((dx / len) * speed, (dy / len) * speed)
    } else if (et === 'curb') {
      // Horizontal or vertical patrol
      const hv = Phaser.Math.Between(0, 1) === 0
      if (hv) e.setVelocity(Phaser.Math.Between(0, 1) ? speed : -speed, 0)
      else e.setVelocity(0, Phaser.Math.Between(0, 1) ? speed : -speed)
      ;(e.body as Phaser.Physics.Arcade.Body).collideWorldBounds = true
      ;(e.body as Phaser.Physics.Arcade.Body).bounce.set(1, 1)
    } else if (et === 'turn') {
      e.setVelocity(0, 0)
      e.setData('dashUntil', 0)
      e.setData('nextDash', this.time.now + Phaser.Math.Between(400, 1000))
      ;(e.body as Phaser.Physics.Arcade.Body).collideWorldBounds = true
      ;(e.body as Phaser.Physics.Arcade.Body).bounce.set(1, 1)
      e.setAngularVelocity(60)
    } else if (et === 'elev') {
      // Orbit around player, periodically changing radius
      const ang = Phaser.Math.FloatBetween(0, Math.PI * 2)
      e.setData('orbitAngle', ang)
      e.setData('orbitRadius', Phaser.Math.Between(30, 70))
      e.setVelocity(0, 0)
    } else if (et === 'barrier') {
      // Slow sweeper across the field
      const dir = Phaser.Math.Between(0, 1)
      e.setVelocity(dir ? 50 : -50, 0)
      ;(e.body as Phaser.Physics.Arcade.Body).collideWorldBounds = true
      ;(e.body as Phaser.Physics.Arcade.Body).bounce.set(1, 1)
    } else if (et === 'sign') {
      e.setVelocity(0, 0)
      e.setData('nextShot', this.time.now + Phaser.Math.Between(600, 1100))
    }
  }

  private showHint(text: string) {
    // Screen-anchored hint
    const t = this.add.text(GAME_WIDTH / 2, 24, text, { color: '#e7e7ef', fontSize: '16px' })
      .setOrigin(0.5, 0).setScrollFactor(0)
    this.time.delayedCall(4500, () => t.destroy())
  }

  private enemyBaseHp(type: string): number {
    const s = this.stage
    const bonus = Math.floor((s - 1) * 0.5)
    switch (type) {
      case 'stairs': return 1 + bonus
      case 'curb': return 2 + bonus
      case 'turn': return 3 + bonus
      case 'elev': return 3 + bonus
      case 'barrier': return 4 + bonus
      case 'sign': return 2 + bonus
      default: return 1 + bonus
    }
  }

  private damageEnemy(e: Enemy, dmg = 1) {
    const hp = (e.getData('hp') as number) ?? 1
    const next = hp - dmg
    if (next <= 0) { this.killEnemy(e); return }
    e.setData('hp', next)
    // brief flash
    this.tweens.add({ targets: e, alpha: 0.5, yoyo: true, duration: 80, repeat: 0 })
  }

  private onProjectileHitEnemy(proj: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, enemy: Enemy) {
    this.resolveProjectileHit(proj, () => this.damageEnemy(enemy, this.projectileDamage))
  }

  private onProjectileHitBoss(proj: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) {
    this.resolveProjectileHit(proj, () => this.damageBoss(this.projectileDamage))
  }

  private resolveProjectileHit(proj: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, onDamage: () => void) {
    const now = this.time.now
    const immuneUntil = (proj.getData('immuneUntil') as number) || 0
    if (immuneUntil > now) return
    onDamage()
    const pierceLeftRaw = proj.getData('pierceLeft')
    const pierceLeft = typeof pierceLeftRaw === 'number' ? pierceLeftRaw : 0
    if (pierceLeft > 0) {
      proj.setData('pierceLeft', pierceLeft - 1)
      proj.setData('immuneUntil', now + 80)
      return
    }
    proj.disableBody(true, true)
  }

  private onDroneHitEnemy(drone: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, enemy: Enemy) {
    this.handleDroneImpact(drone, () => this.damageEnemy(enemy, this.droneDamage))
  }

  private onDroneHitBoss(drone: Phaser.Types.Physics.Arcade.ImageWithDynamicBody) {
    this.handleDroneImpact(drone, () => this.damageBoss(this.droneDamage))
  }

  private handleDroneImpact(drone: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, onDamage: () => void) {
    const now = this.time.now
    const cdUntil = (drone.getData('cdUntil') as number) || 0
    if (now < cdUntil) return
    drone.setData('cdUntil', now + 220)
    onDamage()
  }

  private rebuildDronesFromState() {
    if (!this.drones) return
    this.drones.clear(true, true)
    this.droneSprites = []
    const desired = Math.min(this.droneLevel, this.maxDrones)
    const baselineDamage = 1 + Math.max(0, this.droneLevel - this.maxDrones)
    this.droneDamage = Math.min(5, Math.max(baselineDamage, this.droneDamage))
    this.droneOrbitRadius = 46 + desired * 6
    for (let i = 0; i < desired; i++) this.spawnOrbitingDrone()
    this.refreshDroneAngles()
    this.updateDroneVisuals()
  }

  private spawnOrbitingDrone() {
    if (!this.drones) return
    const key = this.textures.exists('drone') ? 'drone' : 'xp'
    const sprite = this.drones.create(this.player.x, this.player.y, key) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody
    sprite.setOrigin(0.5, 0.5)
    sprite.setAlpha(0.95)
    sprite.setDepth(2)
    sprite.setData('angle', 0)
    sprite.setData('cdUntil', 0)
    const body = sprite.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setImmovable(true)
    body.setVelocity(0, 0)
    body.setSize(sprite.displayWidth, sprite.displayHeight, true)
    this.droneSprites.push(sprite)
  }

  private refreshDroneAngles() {
    this.droneSprites = this.droneSprites.filter(d => d.active)
    const count = this.droneSprites.length
    if (count === 0) return
    this.droneSprites.forEach((sprite, index) => {
      const angle = (index / count) * Math.PI * 2
      sprite.setData('angle', angle)
    })
  }

  private updateDroneVisuals() {
    const strong = this.droneDamage > 1
    const tint = strong ? 0xfff07d : 0x9cfba5
    const scale = strong ? 1.2 : 1.0
    for (const sprite of this.droneSprites) {
      if (!sprite.active) continue
      if (strong) sprite.setTint(tint)
      else sprite.clearTint()
      sprite.setScale(scale)
      const body = sprite.body as Phaser.Physics.Arcade.Body
      body.setSize(sprite.displayWidth, sprite.displayHeight, true)
    }
  }

  private updateDrones(dtMs: number) {
    if (!this.droneSprites.length) return
    const speed = this.droneRotationSpeed * dtMs
    const now = this.time.now
    this.droneSprites = this.droneSprites.filter(d => d.active)
    const count = this.droneSprites.length
    for (let i = 0; i < count; i++) {
      const sprite = this.droneSprites[i]
      const angle = ((sprite.getData('angle') as number) || 0) + speed
      sprite.setData('angle', angle)
      const wobble = Math.sin((now + i * 220) / 520) * 4
      const radius = this.droneOrbitRadius + wobble
      sprite.setPosition(
        this.player.x + Math.cos(angle) * radius,
        this.player.y + Math.sin(angle) * radius,
      )
      const body = sprite.body as Phaser.Physics.Arcade.Body
      body.setVelocity(0, 0)
    }
  }

  private upgradeDrone() {
    this.droneLevel += 1
    const desired = Math.min(this.droneLevel, this.maxDrones)
    while (this.droneSprites.length < desired) this.spawnOrbitingDrone()
    this.droneDamage = Math.min(5, 1 + Math.max(0, this.droneLevel - this.maxDrones))
    this.droneOrbitRadius = Math.min(90, 46 + desired * 6)
    this.refreshDroneAngles()
    this.updateDroneVisuals()
  }

  private upgradeStaticField() {
    this.staticFieldLv += 1
    if (this.staticFieldLv === 1) {
      this.staticFieldCooldown = 4500
      this.staticFieldRadius = 120
      this.staticFieldDamage = 1
      this.nextStaticFieldAt = this.time.now + 1200
    } else {
      this.staticFieldCooldown = Math.max(2000, Math.round(this.staticFieldCooldown * 0.85))
      this.staticFieldRadius = Math.min(240, this.staticFieldRadius + 18)
      if (this.staticFieldLv % 2 === 0) this.staticFieldDamage = Math.min(6, this.staticFieldDamage + 1)
      this.nextStaticFieldAt = Math.min(this.nextStaticFieldAt, this.time.now + 600)
    }
  }

  private updateStaticField() {
    if (this.staticFieldLv <= 0) return
    if (this.time.now < this.nextStaticFieldAt) return
    this.triggerStaticField()
    this.nextStaticFieldAt = this.time.now + this.staticFieldCooldown
  }

  private triggerStaticField() {
    const radius = this.staticFieldRadius
    const circle = this.add.circle(this.player.x, this.player.y, 12, 0x6ea8fe, 0.22)
    circle.setDepth(0)
    const targetScale = radius / 12
    this.tweens.add({ targets: circle, scale: targetScale, alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => circle.destroy() })
    this.playSfx(620)
    const list = this.enemies.getChildren() as Enemy[]
    for (const e of list) {
      if (!e.active) continue
      const dx = e.x - this.player.x
      const dy = e.y - this.player.y
      if (dx * dx + dy * dy <= radius * radius) this.damageEnemy(e, this.staticFieldDamage)
    }
    if (this.boss && this.bossActive) {
      const dx = this.boss.x - this.player.x
      const dy = this.boss.y - this.player.y
      if (dx * dx + dy * dy <= radius * radius) this.damageBoss(this.staticFieldDamage)
    }
  }

  private createBackground() {
    if (!this.textures.exists('tiles')) {
      this.paintFloorPattern()
      return
    }
    // Prefer Tiled only if it is at least as large as our world
    const tm = (this.cache.tilemap as any).get('level1')
    if (tm) {
      const map = this.make.tilemap({ key: 'level1' })
      const tiles = map.addTilesetImage('tiles')
      if (tiles) {
        const pxW = (map as any).widthInPixels ?? (map.width * map.tileWidth)
        const pxH = (map as any).heightInPixels ?? (map.height * map.tileHeight)
        if (pxW >= WORLD_WIDTH && pxH >= WORLD_HEIGHT) {
          const layer = map.createLayer(0, tiles, 0, 0)
          if (layer) { layer.setDepth(-10); this.bgLayer = layer }
          this.paintFloorPattern()
          return
        }
      }
    }
    const tw = 16, th = 16
    const cols = Math.ceil(WORLD_WIDTH / tw)
    const rows = Math.ceil(WORLD_HEIGHT / th)
    const data: number[][] = []
    for (let y = 0; y < rows; y++) {
      const row: number[] = []
      for (let x = 0; x < cols; x++) {
        // 0: base grass, 1: border, 2: sprinkled stones
        let idx = 0
        if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) idx = 1
        else if (((x * 29 + y * 53) % 17) === 0) idx = 2
        row.push(idx)
      }
      data.push(row)
    }
    const map = this.make.tilemap({ data, tileWidth: tw, tileHeight: th })
    const tiles = map.addTilesetImage('tiles')
    if (tiles) {
      const layer = map.createLayer(0, tiles, 0, 0)
      if (layer) { layer.setDepth(-10); this.bgLayer = layer }
    }
    this.paintFloorPattern()
  }

  private ensureFloorPattern() {
    if (!this.floorPattern) {
      this.floorPattern = this.add.renderTexture(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
        .setOrigin(0, 0)
        .setDepth(-9)
    }
    this.floorPattern!.clear()
    this.floorPattern!.setAlpha(0.45)
  }

  private paintFloorPattern() {
    this.ensureFloorPattern()
    if (!this.floorPattern) return
    const pattern = this.floorPattern
    const cell = 64
    for (let y = 0; y < WORLD_HEIGHT; y += cell) {
      for (let x = 0; x < WORLD_WIDTH; x += cell) {
        const even = ((x / cell + y / cell) % 2 === 0)
        pattern.fill(even ? this.floorPalette.even : this.floorPalette.odd, 1, x, y, cell, cell)
        if (((x + y) / cell) % 3 === 0) pattern.fill(this.floorPalette.accent, 0.12, x + 18, y + 18, 12, 12)
      }
    }
    const stripeGap = 160
    const stripeHeight = 10
    for (let y = -stripeGap; y < WORLD_HEIGHT + stripeGap; y += stripeGap) {
      const offset = (Math.floor(y / stripeGap) % 2 === 0) ? 48 : 96
      pattern.fill(this.floorPalette.accent, 0.3, 0, y + offset, WORLD_WIDTH, stripeHeight)
    }
  }

  private applyStageTheme() {
    const pal = ((window as any)._settings?.palette as ('default'|'high'|'mono')) || 'default'
    const table: Record<'default'|'high'|'mono', Record<number, { bg: number, tint: number, grid: { even: number, odd: number, accent: number } }>> = {
      default: {
        1: { bg: 0x0d0f1c, tint: 0xffffff, grid: { even: 0x141a2f, odd: 0x0d1326, accent: 0x1f2946 } },
        2: { bg: 0x0f0f14, tint: 0xcde9ff, grid: { even: 0x1a151f, odd: 0x120f19, accent: 0x2c1f2a } },
        3: { bg: 0x110d14, tint: 0xffe7cd, grid: { even: 0x20111d, odd: 0x170c16, accent: 0x321825 } },
      },
      high: {
        1: { bg: 0x000000, tint: 0xffffff, grid: { even: 0x141414, odd: 0x090909, accent: 0x202020 } },
        2: { bg: 0x000000, tint: 0xfff4c1, grid: { even: 0x1a1507, odd: 0x100d05, accent: 0x2d230a } },
        3: { bg: 0x000000, tint: 0xc1e7ff, grid: { even: 0x09141a, odd: 0x050b10, accent: 0x142430 } },
      },
      mono: {
        1: { bg: 0x000000, tint: 0xffffff, grid: { even: 0x151515, odd: 0x0b0b0b, accent: 0x202020 } },
        2: { bg: 0x000000, tint: 0xdddddd, grid: { even: 0x1a1a1a, odd: 0x0e0e0e, accent: 0x282828 } },
        3: { bg: 0x000000, tint: 0xcccccc, grid: { even: 0x1c1c1c, odd: 0x101010, accent: 0x2f2f2f } },
      }
    }
    const t = (table[pal][this.stage] || table[pal][1])
    this.cameras.main.setBackgroundColor(t.bg as any)
    if (this.bgLayer) this.bgLayer.setTint(t.tint)
    this.floorPalette = t.grid
    this.paintFloorPattern()
  }


  private scheduleAttack() {
    if (this.attackEvt) this.attackEvt.remove(false)
    this.attackEvt = this.time.addEvent({ delay: this.attackCooldown, loop: true, callback: () => this.doAttack() })
  }

  private doAttack() {
    if (this.inLevelUp) return
    this.playSfx(440)
    // Auto-aim: pick nearest enemy; if none, use lastAim
    const target = this.findNearestEnemy()
    if (target) {
      this.lastAim = Math.atan2(target.y - this.player.y, target.x - this.player.x)
    }
    const spread = Phaser.Math.DegToRad(14)
    for (let i = 0; i < this.projCount; i++) {
      const offset = (i - (this.projCount - 1) / 2) * spread
      const angle = this.lastAim + offset
      let b = this.projectiles.getFirstDead(false) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody | null
      if (!b) {
        b = this.projectiles.create(this.player.x, this.player.y, 'bullet') as Phaser.Types.Physics.Arcade.ImageWithDynamicBody
      } else {
        b.enableBody(true, this.player.x, this.player.y, true, true)
        b.setTexture('bullet')
      }
      this.prepareProjectile(b, angle)
      this.time.delayedCall(1500, () => b!.disableBody(true, true))
    }
  }

  private currentProjectileScale(): number {
    const dmgBonus = Math.max(0, this.projectileDamage - 1)
    const pierceBonus = this.pierceTargets * 0.08
    return 1 + Math.min(0.6, dmgBonus * 0.18 + pierceBonus)
  }

  private prepareProjectile(b: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, angle: number) {
    const tintNeeded = this.projectileDamage > 1 || this.pierceTargets > 0
    if (tintNeeded) b.setTint(0xfff07d)
    else b.clearTint()
    const scale = this.currentProjectileScale()
    b.setScale(scale)
    const body = b.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    this.physics.velocityFromRotation(angle, this.projSpeed, body.velocity)
    body.setSize(Math.max(4, b.displayWidth), Math.max(4, b.displayHeight), true)
    b.setRotation(angle)
    b.setDepth(1)
    b.setData('pierceLeft', this.pierceTargets)
    b.setData('immuneUntil', 0)
  }

  private enemyShootAt(sx: number, sy: number, tx: number, ty: number) {
    const bold = !!(window as any)._settings?.projectileBold
    const key = bold && this.textures.exists('enemy_bullet_bold') ? 'enemy_bullet_bold' : 'enemy_bullet'
    let b = this.enemyBullets.getFirstDead(false) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody | null
    if (!b) b = this.enemyBullets.create(sx, sy, key) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody
    else { b.enableBody(true, sx, sy, true, true); b.setTexture(key) }
    const ang = Math.atan2(ty - sy, tx - sx)
    this.physics.velocityFromRotation(ang, Math.round(160 * this.bulletSpeedMul), b.body.velocity)
    this.time.delayedCall(2500, () => b && b.disableBody(true, true))
  }

  private findNearestEnemy(): { x: number, y: number } | null {
    const list = this.enemies.getChildren() as Enemy[]
    let best: Enemy | null = null
    let bestD2 = Infinity
    for (const e of list) {
      if (!e.active) continue
      const dx = e.x - this.player.x
      const dy = e.y - this.player.y
      const d2 = dx * dx + dy * dy
      if (d2 < bestD2) { bestD2 = d2; best = e }
    }
    return best ? { x: best.x, y: best.y } : null
  }

  private applyRunStateIfAny() {
    if (this.isPractice) { clearRunState(); return }
    const rs = loadRunState()
    if (!rs) return
    this.level = rs.level
    this.xp = rs.xp
    this.xpToNext = rs.xpToNext
    this.speed = rs.speed
    this.attackCooldown = rs.attackCooldown
    this.projSpeed = rs.projSpeed
    this.projCount = rs.projCount
    this.projectileDamage = rs.projectileDamage
    this.pierceTargets = rs.pierceTargets
    this.hasMagnet = rs.hasMagnet
    this.magnetRadius = rs.magnetRadius
    this.hasBlast = rs.hasBlast
    this.attackRadius = rs.attackRadius
    this.maxHp = rs.maxHp
    this.hp = Math.min(this.maxHp, rs.hp)
    this.fireRateLv = rs.fireRateLv
    this.projLv = rs.projLv
    this.projSpeedLv = rs.projSpeedLv
    this.damageLv = rs.damageLv
    this.pierceLv = rs.pierceLv
    this.speedLv = rs.speedLv
    this.magnetLv = rs.magnetLv
    this.blastLv = rs.blastLv
    this.staticFieldLv = rs.staticFieldLv
    this.staticFieldCooldown = rs.staticFieldCooldown
    this.staticFieldRadius = rs.staticFieldRadius
    this.staticFieldDamage = rs.staticFieldDamage
    this.droneLevel = rs.droneLevel
    this.droneDamage = rs.droneDamage
    this.nextStaticFieldAt = this.staticFieldLv > 0 ? this.time.now + 600 : 0
    this.rebuildDronesFromState()
    this.lastDamageAt = this.time.now
    this.regenAccumulator = 0
    this.scheduleAttack()
    clearRunState()
  }

  private exportRunState() {
    const rs: RunBuild = {
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      speed: this.speed,
      attackCooldown: this.attackCooldown,
      projSpeed: this.projSpeed,
      projCount: this.projCount,
      projectileDamage: this.projectileDamage,
      pierceTargets: this.pierceTargets,
      hasMagnet: this.hasMagnet,
      magnetRadius: this.magnetRadius,
      hasBlast: this.hasBlast,
      attackRadius: this.attackRadius,
      hp: this.hp,
      maxHp: this.maxHp,
      fireRateLv: this.fireRateLv,
      projLv: this.projLv,
      projSpeedLv: this.projSpeedLv,
      damageLv: this.damageLv,
      pierceLv: this.pierceLv,
      speedLv: this.speedLv,
      magnetLv: this.magnetLv,
      blastLv: this.blastLv,
      staticFieldLv: this.staticFieldLv,
      staticFieldCooldown: this.staticFieldCooldown,
      staticFieldRadius: this.staticFieldRadius,
      staticFieldDamage: this.staticFieldDamage,
      droneLevel: this.droneLevel,
      droneDamage: this.droneDamage,
    }
    saveRunState(rs)
  }

  private radialBlast() {
    const circle = this.add.circle(this.player.x, this.player.y, 6, 0x6ea8fe, 0.18)
    this.tweens.add({ targets: circle, radius: this.attackRadius * 1.4, alpha: 0, duration: 200, ease: 'Quad.easeOut', onComplete: () => circle.destroy() })
    this.playSfx(520)
    const list = this.enemies.getChildren() as Phaser.GameObjects.Image[]
    for (const e of list) {
      const dx = e.x - this.player.x
      const dy = e.y - this.player.y
      if (dx*dx + dy*dy <= (this.attackRadius*1.4)*(this.attackRadius*1.4)) this.damageEnemy(e as any, 2)
    }
  }

  private dropXP(x: number, y: number, value = 1) {
    if (this.isPractice) return
    let orb = this.xpOrbs.getFirstDead(false) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody | null
    if (!orb) {
      orb = this.xpOrbs.create(x, y, 'xp') as Phaser.Types.Physics.Arcade.ImageWithDynamicBody
    } else {
      orb.enableBody(true, x, y, true, true)
      orb.setTexture('xp')
    }
    orb.setData('value', value)
    orb.setVelocity(0, 0)
  }

  private killEnemy(e: Enemy) {
    this.dropXP(e.x, e.y, 1)
    this.spawnHitFx(e.x, e.y)
    this.kills += 1
    e.disableBody(true, true)
    this.playSfx(330)
    if (this.practiceActive && this.enemies.countActive(true) === 0) {
      this.time.delayedCall(300, () => window.dispatchEvent(new CustomEvent('tutorial:play')))
    }
  }

  private spawnHitFx(x: number, y: number) {
    if (!this.anims.exists('fx-hit')) return
    const s = this.add.sprite(x, y, 'fx_hit_0').setScale(2)
    s.anims.play('fx-hit')
    s.on('animationcomplete', () => s.destroy())
  }

  private checkLevelUp() {
    if (this.isPractice) return
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext
      this.level += 1
      this.xpToNext = 5 + Math.floor(this.level * 5)
      this.triggerLevelUp()
    }
  }

  private async triggerLevelUp() {
    this.inLevelUp = true
    if (this.attackEvt) this.attackEvt.paused = true
    if (this.spawnEvt) this.spawnEvt.paused = true
    if (this.runTimerEvt) this.runTimerEvt.paused = true
    this.physics.world.isPaused = true
    // Present 3 upgrades
    const pool: Array<{ key: string, label: string }> = [
      { key: 'fireRate', label: 'Rapid Fire (+20% rate)' },
      { key: 'multiShot', label: '+1 Projectile' },
      { key: 'moveSpeed', label: '+10% Move Speed' },
      { key: 'projSpeed', label: 'Velocity Boost (+15% projectile speed)' },
      { key: 'damage', label: 'Supercharged Shots (+1 damage)' },
    ]
    if (this.pierceTargets < 3) {
      const pierceLabel = this.pierceTargets === 0 ? 'Piercing Shots (bullets pierce +1 enemy)' : 'Piercing Shots (+1 pierce stack)'
      pool.push({ key: 'pierce', label: pierceLabel })
    }
    if (this.staticFieldLv < 4) {
      const staticLabel = this.staticFieldLv === 0 ? 'Static Field (shock pulse every few seconds)' : 'Static Field + (faster, stronger pulses)'
      pool.push({ key: 'staticField', label: staticLabel })
    }
    if (this.droneLevel < 6) {
      const droneLabel = this.droneLevel === 0 ? 'Guardian Drone (orbit ally damages foes)' : 'Guardian Drone + (adds ally or damage)'
      pool.push({ key: 'drone', label: droneLabel })
    }
    pool.push({ key: 'magnet', label: this.hasMagnet ? 'Magnet Boost (+25% radius)' : 'Unlock Magnet (pull XP orbs)' })
    if (this.hasBlast) pool.push({ key: 'blast', label: 'Blast Radius (+20%)' })
    const picks = Phaser.Utils.Array.Shuffle(pool).slice(0, Math.min(3, pool.length))
    const choice = await openLevelUp(picks.map(p => p.label))
    const selected = picks[choice]
    if (selected) {
      switch (selected.key) {
        case 'fireRate':
          this.attackCooldown = Math.max(180, Math.round(this.attackCooldown * 0.8))
          this.scheduleAttack()
          this.fireRateLv += 1
          break
        case 'multiShot':
          this.projCount = Math.min(6, this.projCount + 1)
          this.projLv += 1
          break
        case 'moveSpeed':
          this.speed = Math.min(420, Math.round(this.speed * 1.1))
          this.speedLv += 1
          break
        case 'projSpeed':
          this.projSpeed = Math.min(720, Math.round(this.projSpeed * 1.15))
          this.projSpeedLv += 1
          break
        case 'damage':
          this.projectileDamage = Math.min(6, this.projectileDamage + 1)
          this.damageLv += 1
          break
        case 'pierce':
          this.pierceTargets = Math.min(3, this.pierceTargets + 1)
          this.pierceLv = Math.min(3, this.pierceLv + 1)
          break
        case 'staticField':
          this.upgradeStaticField()
          break
        case 'drone':
          this.upgradeDrone()
          break
        case 'magnet':
          if (!this.hasMagnet) {
            this.hasMagnet = true
            this.magnetRadius = Math.max(120, this.magnetRadius || 120)
          } else {
            this.magnetRadius = Math.min(320, Math.round((this.magnetRadius || 120) * 1.25))
          }
          this.magnetLv += 1
          break
        case 'blast':
          this.attackRadius = Math.min(420, Math.round(this.attackRadius * 1.2))
          this.blastLv += 1
          break
      }
      this.updateDroneVisuals()
    }
    this.hp = this.maxHp
    this.lastDamageAt = this.time.now
    this.regenAccumulator = 0
    this.resetAfterLevelUp()
    this.updateHUD2()
    this.updateBuildHUD()
  }

  private resetAfterLevelUp() {
    this.inLevelUp = false
    if (this.attackEvt) this.attackEvt.paused = false
    if (this.spawnEvt) this.spawnEvt.paused = false
    if (this.runTimerEvt) this.runTimerEvt.paused = false
    this.physics.world.isPaused = false
  }

  private perfAccum = 0
  private perfFrames = 0
  private baseSpawnDelay = 1500
  private currentSpawnDelay = 1500
  private lowSpec = false
  private stageWeights = {
    1: [ // t: seconds elapsed thresholds
      { t: 0,   w: { stairs: 60, curb: 20, turn: 10, elev: 5, barrier: 5, sign: 0 } },
      { t: 30,  w: { stairs: 45, curb: 20, turn: 15, elev: 10, barrier: 5, sign: 5 } },
      { t: 60,  w: { stairs: 35, curb: 20, turn: 20, elev: 10, barrier: 5, sign: 10 } },
    ],
    2: [
      { t: 0,   w: { stairs: 40, curb: 20, turn: 15, elev: 10, barrier: 10, sign: 5 } },
      { t: 45,  w: { stairs: 30, curb: 15, turn: 20, elev: 15, barrier: 10, sign: 10 } },
    ],
    3: [
      { t: 0,   w: { stairs: 30, curb: 15, turn: 20, elev: 15, barrier: 10, sign: 10 } },
      { t: 60,  w: { stairs: 25, curb: 10, turn: 25, elev: 15, barrier: 10, sign: 15 } },
    ],
  } as Record<number, Array<{ t: number, w: Record<string, number> }>>

  private setSpawnDelay(ms: number) {
    this.currentSpawnDelay = ms
    if (this.spawnEvt) this.spawnEvt.remove(false)
    this.spawnEvt = this.time.addEvent({ delay: ms, loop: true, callback: () => this.spawnEnemy() })
  }

  private pickEnemyType(): 'stairs'|'curb'|'turn'|'elev'|'barrier'|'sign' {
    const elapsed = this.runSecInit - this.runSecLeft
    const table = this.stageWeights[this.stage] || this.stageWeights[1]
    let current = table[0].w
    for (const row of table) { if (elapsed >= row.t) current = row.w }
    const entries = Object.entries(current) as Array<[any, number]>
    const total = entries.reduce((a, [,v]) => a+v, 0)
    let r = Math.random() * total
    for (const [k, v] of entries) { r -= v; if (r <= 0) return k as any }
    return 'stairs'
  }

  private tickPerf(dtMs: number) {
    this.perfAccum += dtMs
    this.perfFrames += 1
    if (this.perfAccum >= 2000) {
      const fps = (this.perfFrames / this.perfAccum) * 1000
      const wasLow = this.lowSpec
      if (fps < 45) this.lowSpec = true
      else if (fps > 55) this.lowSpec = false
      if (wasLow !== this.lowSpec) {
        // Adjust spawn pacing on low-spec
        const target = this.lowSpec ? this.currentSpawnDelay + 600 : Math.max(this.baseSpawnDelay, this.currentSpawnDelay - 600)
        this.setSpawnDelay(target)
        this.showHint(this.lowSpec ? '저사양 모드: 스폰 완화' : '성능 회복: 스폰 정상')
      }
      this.perfAccum = 0
      this.perfFrames = 0
    }
  }

  update(_time: number, dtMs: number) {
    if (this.inLevelUp) {
      this.player.setVelocity(0, 0)
      return
    }
    if (this.runOver) {
      this.player.setVelocity(0, 0)
      return
    }
    this.tickPerf(dtMs)
    // Virtual input
    const dir = this.inputLayer.getMoveVector(this.player.x, this.player.y)
    // Allow arrow keys for dev testing
    if (this.cursors.left.isDown) dir.x = -1
    else if (this.cursors.right.isDown) dir.x = 1
    if (this.cursors.up.isDown) dir.y = -1
    else if (this.cursors.down.isDown) dir.y = 1

    this.player.setVelocity(dir.x * this.speed * this.inputLayer.getSpeedMultiplier(), dir.y * this.speed * this.inputLayer.getSpeedMultiplier())

    // Directional animation
    if (dir.lengthSq() > 0) {
      const ax = Math.abs(dir.x), ay = Math.abs(dir.y)
      let key = 'player-down'
      let flipX = false
      if (ax > ay) {
        if (dir.x > 0) { key = this.anims.exists('player-right') ? 'player-right' : 'player-left'; flipX = !this.anims.exists('player-right') }
        else { key = 'player-left'; flipX = false }
      } else {
        key = dir.y > 0 ? 'player-down' : 'player-up'
      }
      if (this.anims.exists(key)) this.player.anims.play(key, true)
      else if (this.anims.exists('player-walk')) this.player.anims.play('player-walk', true)
      this.player.setFlipX(flipX)
    } else {
      this.player.anims.stop()
    }

    // Enemy behaviors by type
    const list = this.enemies.getChildren() as Enemy[]
    for (const e of list) {
      if (!e.active) continue
      const et = (e.getData('type') as string) || 'stairs'
      if (et === 'stairs') {
        const dx = this.player.x - e.x
        const dy = this.player.y - e.y
        const len = Math.hypot(dx, dy) || 1
        const spd = (e.getData('spd') as number) || 60
        e.setVelocity((dx / len) * spd, (dy / len) * spd)
      } else if (et === 'curb') {
        // bounce patrol handled by physics; keep current velocity
      } else if (et === 'turn') {
        const now = this.time.now
        const dashUntil = (e.getData('dashUntil') as number) || 0
        const nextDash = (e.getData('nextDash') as number) || 0
        // Telegraph before dash
        const tele = ((window as any)._settings?.telegraphMs ?? 200) * this.telegraphScale
        const bold = !!(window as any)._settings?.telegraphBold
        if (now + tele >= nextDash && now < nextDash && now >= dashUntil && !e.getData('tele')) {
          const ring = this.add.circle(e.x, e.y, 8, 0xffbf00, bold ? 0.35 : 0.2)
          this.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: tele, onComplete: () => ring.destroy() })
          e.setData('tele', 1); this.time.delayedCall(220, () => e.setData('tele', 0))
        }
        if (now >= nextDash && now >= dashUntil) {
          const dx = this.player.x - e.x
          const dy = this.player.y - e.y
          const ang = Math.atan2(dy, dx)
          const spd = 150
          this.physics.velocityFromRotation(ang, spd, (e.body as Phaser.Physics.Arcade.Body).velocity)
          e.setData('dashUntil', now + 280)
          e.setData('nextDash', now + 1200 + Phaser.Math.Between(-200, 200))
          e.setAngularVelocity(180)
        } else if (now >= dashUntil) {
          e.setVelocity(0, 0)
          e.setAngularVelocity(60)
        }
      } else if (et === 'elev') {
        // Orbit target around player
        const ang = (e.getData('orbitAngle') as number) || 0
        let rad = (e.getData('orbitRadius') as number) || 50
        const angNext = ang + 0.03
        // slight breathing radius
        rad += Math.sin(this.time.now / 600) * 0.1
        const tx = this.player.x + Math.cos(angNext) * rad
        const ty = this.player.y + Math.sin(angNext) * rad
        const dx = tx - e.x, dy = ty - e.y
        const len = Math.hypot(dx, dy) || 1
        const spd = 60
        e.setVelocity((dx / len) * spd, (dy / len) * spd)
        e.setData('orbitAngle', angNext)
        e.setData('orbitRadius', rad)
      } else if (et === 'barrier') {
        // Keep sweeping; physics handles bounce
      } else if (et === 'sign') {
        const now = this.time.now
        const ns = (e.getData('nextShot') as number) || 0
        if (now >= ns) {
          // Telegraph small flash
          const tele = (((window as any)._settings?.telegraphMs ?? 200) * this.telegraphScale) * 0.6
          const bold = !!(window as any)._settings?.telegraphBold
          const ring = this.add.circle(e.x, e.y, 5, 0xff0000, bold ? 0.4 : 0.25)
          this.tweens.add({ targets: ring, alpha: 0, duration: tele, onComplete: () => ring.destroy() })
          this.enemyShootAt(e.x, e.y, this.player.x, this.player.y)
          e.setData('nextShot', now + Phaser.Math.Between(800, 1300))
        }
      }
    }

    // Boss logic
    this.maybeSpawnBoss()
    if (this.bossActive) this.updateBoss()

    if (this.hasMagnet) {
      const orbs = this.xpOrbs.getChildren() as Phaser.Types.Physics.Arcade.ImageWithDynamicBody[]
      for (const o of orbs) {
        if (!o.active) continue
        const dx = this.player.x - o.x
        const dy = this.player.y - o.y
        const dist = Math.hypot(dx, dy)
        if (dist < this.magnetRadius) {
          this.physics.velocityFromRotation(Math.atan2(dy, dx), 120, o.body.velocity)
        } else {
          o.setVelocity(0, 0)
        }
      }
    }

    this.updateDrones(dtMs)
    this.updateStaticField()
    this.handleRegen(dtMs)
  }

  private handleRegen(dtMs: number) {
    if (this.runOver || this.inLevelUp) return
    if (this.hp >= this.maxHp) {
      this.regenAccumulator = 0
      return
    }
    const now = this.time.now
    if (now - this.lastDamageAt < this.regenDelayMs) {
      this.regenAccumulator = 0
      return
    }
    this.regenAccumulator += dtMs
    if (this.regenAccumulator >= this.regenIntervalMs) {
      this.hp = Math.min(this.maxHp, this.hp + 1)
      this.regenAccumulator = 0
      this.updateHUD2()
    }
  }

  private maybeSpawnBoss() {
    if (this.isPractice || this.bossSpawned) return
    const threshold = Math.max(10, Math.round(this.runSecInit * 0.4))
    if (this.runSecLeft <= threshold) {
      this.spawnBoss()
    }
  }

  private spawnBoss() {
    this.bossSpawned = true
    this.bossActive = true
    if (this.spawnEvt) this.spawnEvt.paused = true
    if (this.runTimerEvt) this.runTimerEvt.paused = true
    // Spawn near the camera center so it’s immediately visible
    const cam = this.cameras.main
    const cx = cam.worldView.centerX
    const cy = cam.worldView.centerY
    const key = this.textures.exists('boss') ? 'boss' : (this.textures.exists('boss_sheet') ? 'boss_sheet' : 'enemy')
    this.boss = this.physics.add.sprite(cx, cy - 10, key, 0) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
    this.boss.setScale(2)
    ;(this.boss.body as Phaser.Physics.Arcade.Body).setCircle(20, 8, 8)
    this.bossHpMax = 120 + (this.stage - 1) * 40
    this.bossHp = this.bossHpMax
    this.bossBar = this.add.graphics().setScrollFactor(0)
    this.drawBossBar()
    this.bossAnchorX = cx
    this.bossAnchorY = cy - 10
    // Collisions: player ↔ boss
    this.physics.add.overlap(this.player, this.boss, () => this.onHitEnemy(undefined as any))
    // Collisions: our bullets ↔ boss
    this.physics.add.overlap(this.projectiles, this.boss, (proj) => this.onProjectileHitBoss(proj as Phaser.Types.Physics.Arcade.ImageWithDynamicBody))
    this.physics.add.overlap(this.drones, this.boss, (drone) => this.onDroneHitBoss(drone as Phaser.Types.Physics.Arcade.ImageWithDynamicBody))
    // Entrance flash
    const ring = this.add.circle(this.boss.x, this.boss.y, 10, 0xffbf00, 0.35)
    this.tweens.add({ targets: ring, radius: 60, alpha: 0, duration: 600, onComplete: () => ring.destroy() })
  }

  private updateBoss() {
    const b = this.boss!
    if (!b.active) return
    // Simple hover: circle around the spawn anchor (camera center at spawn)
    const t = this.time.now / 1200
    const R = 12
    b.x = this.bossAnchorX + Math.cos(t) * R
    b.y = this.bossAnchorY + Math.sin(t * 1.2) * R
    // Attacks
    const last = (b.getData('lastAtk') as number) || 0
    if (this.time.now - last > 1400) {
      b.setData('lastAtk', this.time.now)
      const idx = ((b.getData('atkIdx') as number) || 0) % 3
      if (idx === 0) this.bossRingBurst()
      else if (idx === 1) this.bossAimedFan()
      else this.bossZigzagDash()
      b.setData('atkIdx', idx + 1)
    }
  }

  private bossRingBurst() {
    const b = this.boss!
    const tele = (window as any)._settings?.telegraphMs ?? 200
    const bold = !!(window as any)._settings?.telegraphBold
    const ring = this.add.circle(b.x, b.y, 10, 0x6ea8fe, bold ? 0.35 : 0.2)
    this.tweens.add({ targets: ring, radius: 50, alpha: 0, duration: tele + 200, onComplete: () => {
      ring.destroy()
      const shots = 16
      for (let i = 0; i < shots; i++) {
        const ang = (i / shots) * Math.PI * 2
        let eb = this.enemyBullets.getFirstDead(false) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody | null
        if (!eb) eb = this.enemyBullets.create(b.x, b.y, 'enemy_bullet') as Phaser.Types.Physics.Arcade.ImageWithDynamicBody
        else eb.enableBody(true, b.x, b.y, true, true)
        const spd = Math.round((120 + this.stage * 10) * this.bulletSpeedMul)
        this.physics.velocityFromRotation(ang, spd, eb.body.velocity)
        this.time.delayedCall(3000, () => eb && eb.disableBody(true, true))
      }
    } })
  }

  private bossAimedFan() {
    const b = this.boss!
    const tele = ((window as any)._settings?.telegraphMs ?? 200) * this.telegraphScale
    const bold = !!(window as any)._settings?.telegraphBold
    const dir = Math.atan2(this.player.y - b.y, this.player.x - b.x)
    const ring = this.add.arc(b.x, b.y, 12, Phaser.Math.RadToDeg(dir) - 20, Phaser.Math.RadToDeg(dir) + 20, false, 0xff6b6b, bold ? 0.35 : 0.2)
    this.tweens.add({ targets: ring, alpha: 0, duration: tele, onComplete: () => {
      ring.destroy()
      const del = Phaser.Math.DegToRad(12)
      const angles = [dir, dir - del, dir + del, dir - 2*del, dir + 2*del, dir - 3*del, dir + 3*del]
      for (const ang of angles) {
        let eb = this.enemyBullets.getFirstDead(false) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody | null
        if (!eb) eb = this.enemyBullets.create(b.x, b.y, 'enemy_bullet') as Phaser.Types.Physics.Arcade.ImageWithDynamicBody
        else eb.enableBody(true, b.x, b.y, true, true)
        const spd = Math.round((150 + this.stage * 12) * this.bulletSpeedMul)
        this.physics.velocityFromRotation(ang, spd, eb.body.velocity)
        this.time.delayedCall(2800, () => eb && eb.disableBody(true, true))
      }
      if ((window as any)._settings?.screenShake) this.cameras.main.shake(120, 0.004)
    } })
  }

  private bossZigzagDash() {
    const b = this.boss!
    const tele = ((window as any)._settings?.telegraphMs ?? 200) * this.telegraphScale
    const bold = !!(window as any)._settings?.telegraphBold
    const dir = Math.atan2(this.player.y - b.y, this.player.x - b.x)
    const line = this.add.line(b.x, b.y, 0, 0, Math.cos(dir) * 20, Math.sin(dir) * 20, 0xffbf00, bold ? 0.45 : 0.3)
    line.setOrigin(0, 0)
    this.tweens.add({ targets: line, alpha: 0, duration: tele, onComplete: () => {
      line.destroy()
      // Three short dashes with slight zigzag
      const durs = [160, 160, 160]
      const angs = [dir, dir + Phaser.Math.DegToRad(20), dir - Phaser.Math.DegToRad(20)]
      let i = 0
      const dash = () => {
        if (i >= durs.length) { b.setVelocity(0,0); return }
        const a = angs[i]
        this.physics.velocityFromRotation(a, 220, (b.body as Phaser.Physics.Arcade.Body).velocity)
        if ((window as any)._settings?.screenShake) this.cameras.main.shake(100, 0.004)
        this.time.delayedCall(durs[i], () => { (b.body as Phaser.Physics.Arcade.Body).setVelocity(0,0); i++; this.time.delayedCall(80, dash) })
      }
      dash()
    } })
  }

  private damageBoss(dmg: number) {
    this.bossHp = Math.max(0, this.bossHp - dmg)
    this.drawBossBar()
    this.tweens.add({ targets: this.boss, alpha: 0.6, yoyo: true, duration: 80 })
    if (this.bossHp <= 0) {
      this.killBoss()
    }
  }

  private drawBossBar() {
    if (!this.bossBar) return
    const w = Math.min(260, GAME_WIDTH - 20), h = 8
    const x = GAME_WIDTH / 2 - w / 2
    const y = 20
    const t = Phaser.Math.Clamp(this.bossHp / Math.max(1, this.bossHpMax), 0, 1)
    this.bossBar.clear()
    this.bossBar.fillStyle(0x23274a).fillRect(x, y, w, h)
    this.bossBar.fillStyle(0xff6b6b).fillRect(x, y, Math.floor(w * t), h)
  }

  private killBoss() {
    this.bossActive = false
    if (this.boss) this.boss.destroy()
    if (this.bossBar) this.bossBar.destroy()
    // Big explosion FX
    const bursts = 4
    for (let i = 0; i < bursts; i++) {
      const bx = this.bossAnchorX || this.player.x
      const by = this.bossAnchorY || this.player.y
      this.time.delayedCall(i * 100, () => this.spawnHitFx(bx + Phaser.Math.Between(-8,8), by + Phaser.Math.Between(-8,8)))
    }
    // Resume timer, end run as success with rewards
    if (this.runTimerEvt) this.runTimerEvt.paused = true
    this.endRun('time')
  }

  private onHitEnemy(_e: Enemy) {
    const now = this.time.now
    if (now < this.invulnUntil || this.runOver || this.inLevelUp) return
    if (this.isPractice) return
    this.invulnUntil = now + 700
    this.hp = Math.max(0, this.hp - this.damageToPlayer)
    this.lastDamageAt = now
    this.regenAccumulator = 0
    this.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, duration: 80, repeat: 2 })
    this.playSfx(180)
    if ((window as any)._settings?.screenShake) this.cameras.main.shake(100, 0.004)
    if (this.hp <= 0) this.endRun('defeat')
    this.updateHUD2()
  }

  private onBulletHitPlayer() {
    const now = this.time.now
    if (now < this.invulnUntil || this.runOver || this.inLevelUp) return
    if (this.isPractice) return
    this.invulnUntil = now + 700
    this.hp = Math.max(0, this.hp - this.damageToPlayer)
    this.lastDamageAt = now
    this.regenAccumulator = 0
    this.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, duration: 80, repeat: 2 })
    this.playSfx(120)
    if ((window as any)._settings?.screenShake) this.cameras.main.shake(120, 0.005)
    if (this.hp <= 0) this.endRun('defeat')
    this.updateHUD2()
  }

  private playSfx(freq: number) {
    const ctx = (this.sound as any).context as AudioContext | undefined
    if (!ctx) return
    
    // Map frequencies to specific sound types for better theming
    if (freq === 660) {
      // XP collection sound - empowerment
      this.playEmpowermentSound()
    } else if (freq === 880) {
      // Click/menu sound
      this.playMenuSound()
    } else if (freq === 440) {
      // Attack sound - empowerment projectile
      this.playAttackSound()
    } else if (freq === 520) {
      // Blast sound
      this.playBlastSound()
    } else if (freq === 330) {
      // Enemy hit sound
      this.playEnemyHitSound()
    } else if (freq === 180 || freq === 120) {
      // Barrier/damage sound
      this.playBarrierSound()
    } else {
      // Fallback to original sound generation
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.1)
    }
  }

  private playEmpowermentSound() {
    const ctx = (this.sound as any).context as AudioContext | undefined
    if (!ctx) return
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // Create an ascending, harmonious sound
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
    oscillator.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3) // G5
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.3)
  }

  private playBarrierSound() {
    const ctx = (this.sound as any).context as AudioContext | undefined
    if (!ctx) return
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // Create a dissonant, descending sound
    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(220, ctx.currentTime) // A3
    oscillator.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2) // A2
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
    
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.2)
  }

  private playAttackSound() {
    const ctx = (this.sound as any).context as AudioContext | undefined
    if (!ctx) return
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // Create a sharp, focused sound
    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(440, ctx.currentTime) // A4
    oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1) // A5
    
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
    
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.1)
  }

  private playEnemyHitSound() {
    const ctx = (this.sound as any).context as AudioContext | undefined
    if (!ctx) return
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // Create a short, percussive sound
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(330, ctx.currentTime) // E4
    oscillator.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15) // A3
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
    
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.15)
  }

  private playBlastSound() {
    const ctx = (this.sound as any).context as AudioContext | undefined
    if (!ctx) return
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // Create a powerful, resonant sound
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(110, ctx.currentTime) // A2
    oscillator.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.4) // A1
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
    
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.4)
  }

  private playMenuSound() {
    const ctx = (this.sound as any).context as AudioContext | undefined
    if (!ctx) return
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // Create a clean, digital sound
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime) // A5
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)
    
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.05)
  }

  private clearEnemies() {
    const list = this.enemies.getChildren() as Enemy[]
    for (const e of list) (e as Enemy).disableBody(true, true)
  }

  private spawnPracticePack(n: number) {
    for (let i = 0; i < n; i++) this.spawnEnemy()
  }

  private endRun(reason: 'time' | 'defeat') {
    if (this.runOver) return
    if (this.isPractice) return // never end in practice
    this.runOver = true
    if (this.spawnEvt) this.spawnEvt.paused = true
    if (this.attackEvt) this.attackEvt.paused = true
    if (this.runTimerEvt) this.runTimerEvt.paused = true
    this.physics.world.isPaused = true
    if (reason === 'time') {
      this.hp = this.maxHp
      this.lastDamageAt = this.time.now
      this.regenAccumulator = 0
      this.updateHUD2()
      this.exportRunState()
    }
    const survived = this.runSecInit - Math.max(0, this.runSecLeft)
    const detail = { reason, stage: this.stage, survived, level: this.level, kills: this.kills }
    window.dispatchEvent(new CustomEvent('runover:open', { detail }))
  }

  private formatTime(sec: number) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  private updateHUD2() {
    const timer = this.formatTime(Math.max(0, this.runSecLeft))
    const practice = this.isPractice ? ' PRACTICE' : ''
    this.uiText.setText(`Stage ${this.stage}${practice}  |  Time ${timer}\nHP ${this.hp}/${this.maxHp}  Lv ${this.level}  XP ${this.xp}/${this.xpToNext}  Kills ${this.kills}`)
    this.drawTimeBar()
  }

  private openPause() {
    if (this.inLevelUp || this.runOver) return
    this.physics.world.isPaused = true
    if (this.spawnEvt) this.spawnEvt.paused = true
    if (this.attackEvt) this.attackEvt.paused = true
    if (this.runTimerEvt) this.runTimerEvt.paused = true
    window.dispatchEvent(new CustomEvent('pause:open'))
    const onResume = () => {
      window.removeEventListener('pause:resume', onResume)
      this.physics.world.isPaused = false
      if (this.spawnEvt) this.spawnEvt.paused = false
      if (this.attackEvt) this.attackEvt.paused = false
      if (this.runTimerEvt) this.runTimerEvt.paused = false
    }
    window.addEventListener('pause:resume', onResume)
  }

  private drawTimeBar() {
    if (!this.timeBar) return
    const w = Math.min(320, GAME_WIDTH - 16), h = 10
    const x = GAME_WIDTH / 2 - w / 2
    const y = 6
    const t = Phaser.Math.Clamp(this.runSecLeft / this.runSecInit, 0, 1)
    this.timeBar.clear()
    this.timeBar.fillStyle(0x23274a).fillRect(x, y, w, h)
    this.timeBar.fillStyle(0x6ea8fe).fillRect(x, y, Math.floor(w * (1 - t)), h)
  }

  private updateBuildHUD() {
    if (!this.buildHUD) return
    const shotsPerSec = (1000 / this.attackCooldown).toFixed(2)
    const lines: string[] = []
    lines.push(`Proj: x${this.projCount}  Dmg: ${this.projectileDamage}  Pierce: ${this.pierceTargets}`)
    lines.push(`Rate: ${shotsPerSec}/s  Speed: ${this.projSpeed}`)
    lines.push(`Move: ${this.speed}`)
    if (this.staticFieldLv > 0) {
      lines.push(`Static: Lv${this.staticFieldLv} r=${Math.round(this.staticFieldRadius)} cd ${(this.staticFieldCooldown / 1000).toFixed(1)}s`)
    }
    if (this.droneLevel > 0) {
      lines.push(`Drones: ${Math.min(this.droneLevel, this.maxDrones)} dmg ${this.droneDamage}`)
    }
    if (this.hasMagnet) lines.push(`Magnet: r=${Math.round(this.magnetRadius)} (Lv ${Math.max(1, this.magnetLv)})`)
    if (this.hasBlast) lines.push(`Blast: r=${Math.round(this.attackRadius)} (Lv ${Math.max(1, this.blastLv)})`)
    this.buildHUD.setText(lines.join('\n'))
  }

  // Transition from practice → real run without restarting the scene
  private startRealRunNow() {
    if (!this.isPractice) return
    this.isPractice = false
    // Hide practice UI
    window.dispatchEvent(new CustomEvent('ui:practiceMode', { detail: { enabled: false } }))
    // Unpause everything
    this.physics.world.isPaused = false
    if (this.spawnEvt) this.spawnEvt.paused = false
    if (this.attackEvt) this.attackEvt.paused = false
    // Start run timer if not created yet
    if (!this.runTimerEvt) {
      this.runTimerEvt = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
        if (this.runOver) return
        this.runSecLeft -= 1
        if (this.runSecLeft <= 0) this.endRun('time')
        this.updateHUD2()
      } })
    }
    // Reset timer to full for a fresh run
    this.runSecLeft = this.runSecInit
    // Re-apply any stage rewards if needed
    const rewards = loadRewards()
    if (rewards.includes('magnet') && !this.hasMagnet) { this.hasMagnet = true; this.magnetRadius = 100 }
    if (rewards.includes('blast') && !this.hasBlast) {
      this.hasBlast = true
      this.time.addEvent({ delay: 5000, loop: true, callback: () => this.radialBlast() })
    }
    this.hp = this.maxHp
    this.lastDamageAt = this.time.now
    this.regenAccumulator = 0
    // Clean field to avoid leftover practice clutter
    this.clearEnemies()
    for (let i = 0; i < 6; i++) this.spawnEnemy()
    this.showHint('Run started! Survive the timer.')
    this.updateHUD2()
    this.updateBuildHUD()
  }
}
