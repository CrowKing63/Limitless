import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../config'
import { VirtualInput } from '../../input/VirtualInput'
import { openLevelUp } from '../../ui/overlays'
import { loadProgress } from '../../state/progress'

type Enemy = Phaser.Types.Physics.Arcade.ImageWithDynamicBody

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody
  private inputLayer!: VirtualInput
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private enemies!: Phaser.Physics.Arcade.Group
  private xpOrbs!: Phaser.Physics.Arcade.Group
  private uiText!: Phaser.GameObjects.Text

  // Player stats
  private speed = 160
  private level = 1
  private xp = 0
  private xpToNext = 5
  private attackRadius = 100
  private attackCooldown = 800 // ms
  private attackEvt?: Phaser.Time.TimerEvent
  private inLevelUp = false
  private spawnEvt?: Phaser.Time.TimerEvent
  private enemySpeedMul = 1

  // Run & meta
  private runSecLeft = 90
  private runSecInit = 90
  private runTimerEvt?: Phaser.Time.TimerEvent
  private runOver = false
  private stage = 1
  private kills = 0
  private hp = 3
  private invulnUntil = 0
  private practiceActive = false

  constructor() { super('game') }

  create() {
    // Stage / meta
    const prog = loadProgress()
    this.stage = Math.max(1, (prog as any)?.currentStage || (prog as any)?.highestUnlocked || 1)
    // Short runs; extend slightly with stage
    this.runSecInit = Math.min(180, 90 + (this.stage - 1) * 15)
    this.runSecLeft = this.runSecInit
    // Player
    this.player = this.physics.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'player')
    this.player.setCircle(16)
    this.player.setCollideWorldBounds(true)

    // Input
    this.inputLayer = new VirtualInput(this)
    this.inputLayer.attach()
    this.cursors = this.input.keyboard!.createCursorKeys()

    // Voice commands
    window.addEventListener('voice:command', (e: Event) => {
      const detail = (e as CustomEvent).detail as any
      if (!detail) return
      if (detail.type === 'move') {
        const dist = (window as any)._settings?.faceNudgeDistance ?? 160
        this.inputLayer.nudgeTowards(detail.dir, dist)
      } else if (detail.type === 'stop') {
        this.inputLayer.stop()
      }
    })

    // Enemies + XP groups
    this.enemies = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image })
    this.xpOrbs = this.physics.add.group({ allowGravity: false, immovable: true })
    for (let i = 0; i < 6; i++) this.spawnEnemy()

    // Damage on touch (with brief i-frames)
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.onHitEnemy(e as Enemy))

    // Collect XP
    this.physics.add.overlap(this.player, this.xpOrbs, (_p, orb) => {
      const o = orb as Phaser.Types.Physics.Arcade.ImageWithDynamicBody & { value?: number }
      this.xp += o.getData('value') ?? 1
      o.disableBody(true, true)
      this.checkLevelUp()
      this.updateHUD2()
    })

    // Difficulty presets + stage scaling
    const diff = (window as any)._settings?.difficulty || 'standard'
    let spawnDelay = 1500
    if (diff === 'relaxed') { spawnDelay = 2200; this.enemySpeedMul = 0.85 }
    else if (diff === 'intense') { spawnDelay = 1000; this.enemySpeedMul = 1.2 }
    this.enemySpeedMul *= 1 + (this.stage - 1) * 0.08
    spawnDelay = Math.max(700, Math.round(spawnDelay - (this.stage - 1) * 120))
    // Spawn loop
    this.spawnEvt = this.time.addEvent({ delay: spawnDelay, loop: true, callback: () => this.spawnEnemy() })

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

    // Short run timer
    this.runTimerEvt = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
      if (this.runOver) return
      this.runSecLeft -= 1
      if (this.runSecLeft <= 0) this.endRun('time')
      this.updateHUD2()
    }})

    // Auto-attack
    this.scheduleAttack()

    // UI
    this.uiText = this.add.text(8, 8, '', { color: '#e7e7ef', fontSize: '14px' }).setScrollFactor(0)
    this.updateHUD2()
    this.showHint('Click to move, or open Settings → Pointer‑Follow')
  }

  private spawnEnemy() {
    // Spawn at the edges
    const side = Phaser.Math.Between(0, 3)
    const margin = 30
    let x = 0, y = 0
    if (side === 0) { x = margin; y = Phaser.Math.Between(margin, GAME_HEIGHT - margin) }
    else if (side === 1) { x = GAME_WIDTH - margin; y = Phaser.Math.Between(margin, GAME_HEIGHT - margin) }
    else if (side === 2) { y = margin; x = Phaser.Math.Between(margin, GAME_WIDTH - margin) }
    else { y = GAME_HEIGHT - margin; x = Phaser.Math.Between(margin, GAME_WIDTH - margin) }

    let e = this.enemies.getFirstDead(false) as Enemy | null
    if (!e) {
      e = this.enemies.create(x, y, 'enemy') as Enemy
    } else {
      e.enableBody(true, x, y, true, true)
      ;(e as any).setTexture && (e as any).setTexture('enemy')
    }
    e.setCircle(14)
    const speed = Phaser.Math.Between(40, 80) * this.enemySpeedMul
    e.setData('spd', speed)
    // Initial nudge toward current player position; tracking continues in update()
    const dx = this.player.x - x, dy = this.player.y - y
    const len = Math.hypot(dx, dy) || 1
    e.setVelocity((dx / len) * speed, (dy / len) * speed)
  }

  private showHint(text: string) {
    const t = this.add.text(GAME_WIDTH / 2, 24, text, { color: '#e7e7ef', fontSize: '16px' }).setOrigin(0.5, 0)
    this.time.delayedCall(4500, () => t.destroy())
  }


  private scheduleAttack() {
    if (this.attackEvt) this.attackEvt.remove(false)
    this.attackEvt = this.time.addEvent({ delay: this.attackCooldown, loop: true, callback: () => this.doAttack() })
  }

  private doAttack() {
    if (this.inLevelUp) return
    // Visual pulse (slightly cheaper)
    const circle = this.add.circle(this.player.x, this.player.y, 6, 0x6ea8fe, 0.18)
    this.tweens.add({ targets: circle, radius: this.attackRadius, alpha: 0, duration: 180, ease: 'Quad.easeOut', onComplete: () => circle.destroy() })

    const list = this.enemies.getChildren() as Phaser.GameObjects.Image[]
    for (const e of list) {
      const dx = e.x - this.player.x
      const dy = e.y - this.player.y
      if (dx*dx + dy*dy <= this.attackRadius*this.attackRadius) {
        this.killEnemy(e as any)
      }
    }
  }

  private dropXP(x: number, y: number, value = 1) {
    let orb = this.xpOrbs.getFirstDead(false) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody | null
    if (!orb) {
      orb = this.xpOrbs.create(x, y, 'xp') as Phaser.Types.Physics.Arcade.ImageWithDynamicBody
    } else {
      orb.enableBody(true, x, y, true, true)
      orb.setTexture('xp')
    }
    orb.setData('value', value)
  }

  private killEnemy(e: Enemy) {
    this.dropXP(e.x, e.y, 1)
    this.kills += 1
    e.disableBody(true, true)
    if (this.practiceActive && this.enemies.countActive(true) === 0) {
      this.time.delayedCall(300, () => window.dispatchEvent(new CustomEvent('tutorial:play')))
    }
  }

  private checkLevelUp() {
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
    // Present 3 upgrades
    const pool = [
      '+20% Attack Rate',
      '+10% Attack Radius',
      '+10% Move Speed',
    ]
    const picks = Phaser.Utils.Array.Shuffle(pool).slice(0, 3)
    const choice = await openLevelUp(picks)
    const selected = picks[choice]
    if (selected.includes('Rate')) {
      this.attackCooldown = Math.max(200, Math.round(this.attackCooldown * 0.8))
      this.scheduleAttack()
    } else if (selected.includes('Radius')) {
      this.attackRadius = Math.min(280, this.attackRadius * 1.1)
    } else if (selected.includes('Move Speed')) {
      this.speed = Math.min(400, Math.round(this.speed * 1.1))
    }
    this.inLevelUp = false
    if (this.attackEvt) this.attackEvt.paused = false
    this.updateHUD2()
  }

  private perfAccum = 0
  private perfFrames = 0
  private baseSpawnDelay = 1500
  private currentSpawnDelay = 1500
  private lowSpec = false

  private setSpawnDelay(ms: number) {
    this.currentSpawnDelay = ms
    if (this.spawnEvt) this.spawnEvt.remove(false)
    this.spawnEvt = this.time.addEvent({ delay: ms, loop: true, callback: () => this.spawnEnemy() })
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

  update(_: number, _dtMs: number) {
    if (this.inLevelUp) {
      this.player.setVelocity(0, 0)
      return
    }
    if (this.runOver) {
      this.player.setVelocity(0, 0)
      return
    }
    this.tickPerf(_dtMs)
    // Virtual input
    const dir = this.inputLayer.getMoveVector(this.player.x, this.player.y)
    // Allow arrow keys for dev testing
    if (this.cursors.left.isDown) dir.x = -1
    else if (this.cursors.right.isDown) dir.x = 1
    if (this.cursors.up.isDown) dir.y = -1
    else if (this.cursors.down.isDown) dir.y = 1

    this.player.setVelocity(dir.x * this.speed * this.inputLayer.getSpeedMultiplier(), dir.y * this.speed * this.inputLayer.getSpeedMultiplier())

    // Face movement direction
    if (dir.lengthSq() > 0) this.player.setRotation(Math.atan2(dir.y, dir.x))

    // Enemy chasing: continuously seek current player position
    const list = this.enemies.getChildren() as Enemy[]
    for (const e of list) {
      if (!e.active) continue
      const dx = this.player.x - e.x
      const dy = this.player.y - e.y
      const len = Math.hypot(dx, dy) || 1
      const spd = (e.getData('spd') as number) || 60
      e.setVelocity((dx / len) * spd, (dy / len) * spd)
    }
  }

  private onHitEnemy(_e: Enemy) {
    const now = this.time.now
    if (now < this.invulnUntil || this.runOver || this.inLevelUp) return
    this.invulnUntil = now + 700
    this.hp = Math.max(0, this.hp - 1)
    this.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, duration: 80, repeat: 2 })
    if (this.hp <= 0) this.endRun('defeat')
    this.updateHUD2()
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
    this.runOver = true
    if (this.spawnEvt) this.spawnEvt.paused = true
    if (this.attackEvt) this.attackEvt.paused = true
    if (this.runTimerEvt) this.runTimerEvt.paused = true
    const survived = this.runSecInit - Math.max(0, this.runSecLeft)
    const tokens = Math.max(1, Math.floor(this.kills / 12) + Math.floor(this.level / 2) + (reason === 'time' ? 2 : 0))
    const detail = { reason, stage: this.stage, survived, level: this.level, kills: this.kills, tokens }
    window.dispatchEvent(new CustomEvent('runover:open', { detail }))
  }

  private formatTime(sec: number) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  private updateHUD2() {
    const timer = this.formatTime(Math.max(0, this.runSecLeft))
    this.uiText.setText(`Stage ${this.stage}  |  Time ${timer}\nHP ${this.hp}  Lv ${this.level}  XP ${this.xp}/${this.xpToNext}  Kills ${this.kills}`)
  }
}
