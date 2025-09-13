import Phaser from 'phaser'

export class Boot extends Phaser.Scene {
  constructor() { super('boot') }
  preload() {
    // Create simple textures for player/enemy/xp using graphics
    const g = this.add.graphics()
    // Player circle
    g.fillStyle(0x6ea8fe).fillCircle(16, 16, 16)
    g.generateTexture('player', 32, 32)
    g.clear()
    // Enemy
    g.fillStyle(0xff6b6b).fillCircle(14, 14, 14)
    g.generateTexture('enemy', 28, 28)
    g.clear()
    // XP gem
    g.fillStyle(0x9cfba5).fillCircle(6, 6, 6)
    g.generateTexture('xp', 12, 12)
    g.destroy()
  }
  create() { this.scene.start('game') }
}

