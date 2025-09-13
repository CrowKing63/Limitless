import Phaser from 'phaser'
import { loadSettings, type MovementMode } from '../state/settings'

export class VirtualInput {
  private scene: Phaser.Scene
  private pointerPos = new Phaser.Math.Vector2()
  private targetPos: Phaser.Math.Vector2 | null = null
  private mode: MovementMode
  private arrivedRadius = 8
  private followDeadzone = 16
  private followGain = 1.0
  private followMaxDist = 240
  private followCurve = 1.0
  private lastDistance = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    const s = loadSettings()
    this.mode = s.movementMode
    this.arrivedRadius = s.clickArriveRadius
    this.followDeadzone = s.followDeadzone
    this.followGain = s.followGain
    this.followMaxDist = s.followMaxDist
    this.followCurve = s.followCurve
  }

  setMode(mode: MovementMode) {
    this.mode = mode
  }

  // Voice: move a fixed step in a direction without continuous input
  nudgeTowards(dir: 'up' | 'down' | 'left' | 'right', distance = 160) {
    const { x, y } = this.scene.cameras.main
    // Use player's current world position via provided coords at call site if needed
    const player = (this.scene as any).player as Phaser.GameObjects.Image | undefined
    const px = player ? player.x : x + this.scene.cameras.main.width / 2
    const py = player ? player.y : y + this.scene.cameras.main.height / 2
    let tx = px, ty = py
    if (dir === 'up') ty -= distance
    else if (dir === 'down') ty += distance
    else if (dir === 'left') tx -= distance
    else if (dir === 'right') tx += distance
    this.targetPos = new Phaser.Math.Vector2(tx, ty)
    this.mode = 'click'
  }

  stop() {
    this.targetPos = null
  }

  attach() {
    const input = this.scene.input
    input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.pointerPos.set(p.worldX, p.worldY)
      // In click mode, pointerdown sets a target we move toward
      if (this.mode === 'click') {
        this.targetPos = this.pointerPos.clone()
      }
    })
    input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.pointerPos.set(p.worldX, p.worldY)
    })

    // React to external settings changes
    window.addEventListener('settings:changed', (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.movementMode) this.mode = detail.movementMode
      if (typeof detail?.clickArriveRadius === 'number') this.arrivedRadius = detail.clickArriveRadius
      if (typeof detail?.followDeadzone === 'number') this.followDeadzone = detail.followDeadzone
      if (typeof detail?.followGain === 'number') this.followGain = detail.followGain
      if (typeof detail?.followMaxDist === 'number') this.followMaxDist = Math.max(1, detail.followMaxDist)
      if (typeof detail?.followCurve === 'number') this.followCurve = Math.max(0.2, detail.followCurve)
    })
  }

  getSpeedMultiplier(): number {
    if (this.mode !== 'follow') return 1.0
    const maxD = Math.max(this.followDeadzone + 1, this.followMaxDist)
    const tRaw = (this.lastDistance - this.followDeadzone) / (maxD - this.followDeadzone)
    const t = Phaser.Math.Clamp(tRaw, 0, 1)
    const shaped = Math.pow(t, this.followCurve)
    return this.followGain * shaped
  }

  // Returns a normalized movement vector toward the current goal
  getMoveVector(playerX: number, playerY: number): Phaser.Math.Vector2 {
    const v = new Phaser.Math.Vector2(0, 0)
    if (this.mode === 'follow') {
      // steer toward current pointer position
      v.set(this.pointerPos.x - playerX, this.pointerPos.y - playerY)
      const d2 = v.lengthSq()
      this.lastDistance = Math.sqrt(d2)
      if (d2 < this.followDeadzone * this.followDeadzone) {
        v.set(0, 0)
      }
    } else if (this.mode === 'click' && this.targetPos) {
      v.set(this.targetPos.x - playerX, this.targetPos.y - playerY)
      if (v.lengthSq() <= this.arrivedRadius * this.arrivedRadius) {
        // Arrived: stop and clear target
        this.targetPos = null
        v.set(0, 0)
      }
      this.lastDistance = 0
    }
    return v.normalize()
  }
}
