import Phaser from 'phaser'

export class Boot extends Phaser.Scene {
  constructor() { super('boot') }

  preload() {
    // Prefer external pixel art if present in /public/assets
    this.load.setPath('assets')
    // Load possible sprite sheets (16x16 frames). If the file is a single 16x16 image,
    // the spritesheet loader will still succeed with 1 frame.
    this.load.spritesheet('player_sheet', 'custom/player_accessible.png', { frameWidth: 16, frameHeight: 16 })
    this.load.spritesheet('enemy_sheet', 'custom/enemy_stairs.png', { frameWidth: 16, frameHeight: 16 })
    this.load.spritesheet('enemy_curb_sheet', 'custom/enemy_curb.png', { frameWidth: 16, frameHeight: 16 })
    this.load.spritesheet('enemy_turn_sheet', 'custom/enemy_turnstile.png', { frameWidth: 16, frameHeight: 16 })
    this.load.spritesheet('enemy_elev_sheet', 'custom/enemy_elevator.png', { frameWidth: 16, frameHeight: 16 })
    this.load.spritesheet('enemy_barrier_sheet', 'custom/enemy_barrier.png', { frameWidth: 16, frameHeight: 16 })
    this.load.spritesheet('enemy_sign_sheet', 'custom/enemy_sign.png', { frameWidth: 16, frameHeight: 16 })
    this.load.spritesheet('boss_sheet', 'custom/boss_oppression.png', { frameWidth: 48, frameHeight: 48 })
    // Optional external FX sheet (16x16 grid)
    this.load.spritesheet('fx_explosion_sheet', 'fx_explosion.png', { frameWidth: 16, frameHeight: 16 })
    this.load.image('bullet', 'custom/bullet_empowerment.png')
    this.load.image('xp', 'custom/xp_empowerment.png')
    this.load.image('tiles', 'custom/tiles_accessible.png')
    // Optional external Tiled map support
    this.load.tilemapTiledJSON('level1', 'level1.json')
  }

  create() {
    // If any key is missing (e.g., no external asset), generate a simple fallback
    const ensure = (key: string, make: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return
      const g = this.add.graphics()
      make(g)
      g.destroy()
    }

    // Helper: materialize a static texture from a frame of a spritesheet
    const ensureFromSheet = (sheetKey: string, frame: number, key: string, w = 16, h = 16, scale = 1) => {
      if (this.textures.exists(key)) return
      if (!this.textures.exists(sheetKey)) return
      const rt = this.add.renderTexture(0, 0, w, h).setVisible(false)
      const spr = this.add.sprite(w / 2, h / 2, sheetKey, frame).setVisible(false)
      spr.setOrigin(0.5, 0.5)
      if (scale !== 1) spr.setScale(scale)
      rt.draw(spr)
      rt.saveTexture(key)
      spr.destroy()
      rt.destroy()
    }

    // If external sheets are present, create single-frame textures used by the game (16x16 base)
    ensureFromSheet('player_sheet', 0, 'player', 16, 16, 1)
    ensureFromSheet('enemy_sheet', 0, 'enemy', 16, 16, 1)
    ensureFromSheet('enemy_curb_sheet', 0, 'enemy_curb', 16, 16, 1)
    ensureFromSheet('enemy_turn_sheet', 0, 'enemy_turn', 16, 16, 1)
    ensureFromSheet('enemy_elev_sheet', 0, 'enemy_elev', 16, 16, 1)
    ensureFromSheet('enemy_barrier_sheet', 0, 'enemy_barrier', 16, 16, 1)
    ensureFromSheet('enemy_sign_sheet', 0, 'enemy_sign', 16, 16, 1)
    // Boss 48x48 (falls back to generated ornament)
    if (!this.textures.exists('boss') && this.textures.exists('boss_sheet')) {
      const frame = 0
      const rt = this.add.renderTexture(0, 0, 48, 48).setVisible(false)
      const spr = this.add.sprite(24, 24, 'boss_sheet', frame).setVisible(false)
      rt.draw(spr); rt.saveTexture('boss'); spr.destroy(); rt.destroy()
    }

    ensure('player', g => {
      // 16x16 wheelchair icon with occupant, high-contrast + 1px black outline
      // Rear wheel (outline underlay)
      g.lineStyle(1, 0x000000, 1).strokeCircle(7, 11, 5)
      g.fillStyle(0x6ea8fe).fillCircle(7, 11, 5)
      g.fillStyle(0x0d0f1c).fillCircle(7, 11, 2)
      // Front caster
      g.lineStyle(1, 0x000000, 1).strokeCircle(12, 14, 2)
      g.fillStyle(0x6ea8fe).fillCircle(12, 14, 2)
      // Seat + frame: draw black outline first, then colored stroke for contrast
      g.lineStyle(3, 0x000000, 1)
      g.beginPath(); g.moveTo(5, 6); g.lineTo(10, 6); g.lineTo(12, 10); g.strokePath()
      g.beginPath(); g.moveTo(7, 6); g.lineTo(7, 9); g.strokePath()
      g.lineStyle(2, 0x6ea8fe, 1)
      g.beginPath(); g.moveTo(5, 6); g.lineTo(10, 6); g.lineTo(12, 10); g.strokePath()
      g.beginPath(); g.moveTo(7, 6); g.lineTo(7, 9); g.strokePath()
      // Occupant head
      g.lineStyle(1, 0x000000, 1).strokeCircle(11, 4, 2)
      g.fillStyle(0xffffff).fillCircle(11, 4, 2)
      g.generateTexture('player', 16, 16)
      g.clear()
    })

    ensure('enemy', g => {
      // Stairs (obstacle): three steps, red for threat with 1px outline
      g.fillStyle(0xff6b6b)
      g.fillRect(1, 11, 14, 4)
      g.fillRect(5, 7, 10, 4)
      g.fillRect(9, 3, 6, 4)
      g.lineStyle(1, 0x000000, 1)
      g.strokeRect(1, 11, 14, 4)
      g.strokeRect(5, 7, 10, 4)
      g.strokeRect(9, 3, 6, 4)
      g.generateTexture('enemy', 16, 16)
      g.clear()
    })

    ensure('enemy_curb', g => {
      // Curb / step edge: two-tone slab with edge highlight + outline
      g.fillStyle(0xbfc3cf).fillRect(0, 9, 16, 7)
      g.fillStyle(0x8f94a3).fillRect(0, 13, 16, 3)
      g.fillStyle(0xffffff).fillRect(0, 9, 16, 1) // top highlight
      g.lineStyle(1, 0x000000, 1)
      g.strokeRect(0, 9, 16, 7)
      g.strokeRect(0, 13, 16, 3)
      g.generateTexture('enemy_curb', 16, 16)
      g.clear()
    })

    ensure('enemy_turn', g => {
      // Turnstile: post + arm with outline
      g.fillStyle(0xffbf00)
      g.fillRect(6, 3, 4, 10) // post
      g.fillRect(4, 7, 12, 2) // arm
      g.lineStyle(1, 0x000000, 1)
      g.strokeRect(6, 3, 4, 10)
      g.strokeRect(4, 7, 12, 2)
      g.generateTexture('enemy_turn', 16, 16)
      g.clear()
    })

    ensure('enemy_elev', g => {
      // Elevator (doors) with out-of-order X overlay, all outlined
      g.fillStyle(0x7e57c2).fillRect(1, 1, 14, 14)
      g.lineStyle(1, 0x000000, 1).strokeRect(1, 1, 14, 14)
      g.fillStyle(0xbfc3cf)
      g.fillRect(4, 4, 4, 8) // left door
      g.fillRect(8, 4, 4, 8) // right door
      g.lineStyle(1, 0x000000, 1)
      g.strokeRect(4, 4, 4, 8)
      g.strokeRect(8, 4, 4, 8)
      // Red X with black outline underneath
      g.lineStyle(3, 0x000000, 1)
      g.beginPath(); g.moveTo(3, 3); g.lineTo(13, 13); g.strokePath()
      g.beginPath(); g.moveTo(13, 3); g.lineTo(3, 13); g.strokePath()
      g.lineStyle(2, 0xff3b30, 1)
      g.beginPath(); g.moveTo(3, 3); g.lineTo(13, 13); g.strokePath()
      g.beginPath(); g.moveTo(13, 3); g.lineTo(3, 13); g.strokePath()
      g.generateTexture('enemy_elev', 16, 16)
      g.clear()
    })

    ensure('enemy_barrier', g => {
      // Construction barricade: hazard stripes on stand + outline
      g.fillStyle(0xff6b00).fillRect(1, 5, 14, 6)
      g.fillStyle(0x000000)
      for (let x = 1; x < 15; x += 4) g.fillRect(x, 5, 2, 6)
      g.lineStyle(1, 0x000000, 1).strokeRect(1, 5, 14, 6)
      g.fillStyle(0x6b6b6b)
      g.fillRect(3, 12, 3, 2); g.fillRect(10, 12, 3, 2)
      g.lineStyle(1, 0x000000, 1)
      g.strokeRect(3, 12, 3, 2); g.strokeRect(10, 12, 3, 2)
      g.generateTexture('enemy_barrier', 16, 16)
      g.clear()
    })

    ensure('enemy_sign', g => {
      // Inaccessible route sign (wheelchair + slash)
      g.fillStyle(0xffffff).fillCircle(7, 9, 3)
      g.lineStyle(1, 0x000000, 1).strokeCircle(7, 9, 3)
      g.fillStyle(0x0d0f1c).fillCircle(7, 9, 1)
      g.fillStyle(0xffffff).fillRect(6, 6, 6, 2)
      g.lineStyle(1, 0x000000, 1).strokeRect(6, 6, 6, 2)
      g.fillStyle(0xffffff).fillRect(6, 6, 1, 4)
      g.lineStyle(1, 0x000000, 1).strokeRect(6, 6, 1, 4)
      // Red slash with black outline
      g.lineStyle(3, 0x000000, 1)
      g.beginPath(); g.moveTo(3, 13); g.lineTo(13, 3); g.strokePath()
      g.lineStyle(2, 0xff3b30, 1)
      g.beginPath(); g.moveTo(3, 13); g.lineTo(13, 3); g.strokePath()
      g.generateTexture('enemy_sign', 16, 16)
      g.clear()
    })

    if (!this.textures.exists('boss')) {
      // Generated flashy boss: spiky orb
      const g = this.add.graphics()
      g.fillStyle(0x6ea8fe, 1)
      g.fillCircle(24, 24, 16)
      g.lineStyle(3, 0xffbf00, 1)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        const x1 = 24 + Math.cos(a) * 18
        const y1 = 24 + Math.sin(a) * 18
        const x2 = 24 + Math.cos(a) * 22
        const y2 = 24 + Math.sin(a) * 22
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath()
      }
      g.generateTexture('boss', 48, 48)
      g.destroy()
    }

    // Enemy bullet (if not provided as bullet.png)
    if (!this.textures.exists('enemy_bullet')) {
      const g = this.add.graphics()
      // default 4x4 with 1px outline
      g.fillStyle(0x000000).fillRect(0, 0, 4, 4)
      g.fillStyle(0xff6b6b).fillRect(1, 1, 2, 2)
      g.generateTexture('enemy_bullet', 4, 4)
      g.clear()
      // bold 6x6 with 1px outline and 4x4 core
      g.fillStyle(0x000000).fillRect(0, 0, 6, 6)
      g.fillStyle(0xff6b6b).fillRect(1, 1, 4, 4)
      g.generateTexture('enemy_bullet_bold', 6, 6)
      g.destroy()
    }

    ensure('bullet', g => {
      g.fillStyle(0xffffff).fillRect(0, 0, 8, 2)
      g.generateTexture('bullet', 8, 2)
      g.clear()
    })

    ensure('xp', g => {
      g.fillStyle(0x9cfba5).fillCircle(6, 6, 6)
      g.generateTexture('xp', 12, 12)
      g.clear()
    })

    ensure('drone', g => {
      g.lineStyle(2, 0x000000, 1).strokeCircle(6, 6, 5)
      g.fillStyle(0x9cfba5).fillCircle(6, 6, 4)
      g.fillStyle(0xffffff, 0.8).fillCircle(8, 4, 1.5)
      g.generateTexture('drone', 12, 12)
      g.clear()
    })

    // Pixel-perfect camera rounding across scenes
    this.cameras.main.setRoundPixels(true)

    // Global animations (auto-derive from sheet dimensions)
    if (this.textures.exists('player_sheet')) {
      const img = (this.textures.get('player_sheet') as any).getSourceImage() as HTMLImageElement
      const cols = Math.max(1, Math.floor(img.width / 16))
      const rows = Math.max(1, Math.floor(img.height / 16))
      const mk = (key: string, row: number, len = Math.min(8, cols)) => {
        if (!this.anims.exists(key)) {
          const start = row * cols
          this.anims.create({ key, frames: this.anims.generateFrameNumbers('player_sheet', { start, end: start + len - 1 }), frameRate: 8, repeat: -1 })
        }
      }
      // Common row order guess: 0=down, 1=left, 2=right, 3=up; fallbacks when rows < 4
      mk('player-down', 0)
      if (rows >= 2) mk('player-left', 1)
      if (rows >= 3) mk('player-right', 2)
      if (rows >= 4) mk('player-up', 3)
      else mk('player-up', 0)
      if (!this.anims.exists('player-walk')) this.anims.create({ key: 'player-walk', frames: this.anims.generateFrameNumbers('player_sheet', { start: 0, end: Math.min(7, cols - 1) }), frameRate: 8, repeat: -1 })
    }
    if (this.textures.exists('enemy_sheet')) {
      if (!this.anims.exists('enemy-idle')) {
        this.anims.create({ key: 'enemy-idle', frames: this.anims.generateFrameNumbers('enemy_sheet', { start: 0, end: 3 }), frameRate: 6, repeat: -1 })
      }
    }

    // FX: prefer external explosion sheet; fallback to generated circles
    if (this.textures.exists('fx_explosion_sheet')) {
      if (!this.anims.exists('fx-hit')) {
        const tex = this.textures.get('fx_explosion_sheet') as any
        const img = tex.getSourceImage() as HTMLImageElement
        const cols = Math.max(1, Math.floor(img.width / 16))
        const rows = Math.max(1, Math.floor(img.height / 16))
        const count = Math.min(cols * rows, 16)
        this.anims.create({ key: 'fx-hit', frames: this.anims.generateFrameNumbers('fx_explosion_sheet', { start: 0, end: count - 1 }), frameRate: 24, repeat: 0 })
      }
    } else {
      if (!this.anims.exists('fx-hit')) {
        const frames: string[] = []
        for (let i = 0; i < 4; i++) {
          const k = `fx_hit_${i}`
          if (!this.textures.exists(k)) {
            const g = this.add.graphics()
            const r = 3 + i * 2
            g.fillStyle(0xffffff, 1)
            g.fillCircle(8, 8, r)
            g.generateTexture(k, 16, 16)
            g.destroy()
          }
          frames.push(k)
        }
        this.anims.create({ key: 'fx-hit', frames: frames.map(f => ({ key: f })), frameRate: 20, repeat: 0 })
      }
    }
    this.scene.start('menu')
  }
}
