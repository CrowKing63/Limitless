import Phaser from 'phaser'

export class Boot extends Phaser.Scene {
  constructor() { super('boot') }
  preload() {
    // Create simple textures for player/enemy/xp/bullet using graphics
    const g = this.add.graphics()

    // Player – wheelchair style: body with two wheels
    g.fillStyle(0x6ea8fe)
    g.fillRect(6, 4, 20, 16) // seat
    g.fillCircle(10, 24, 6) // left wheel
    g.fillCircle(22, 24, 6) // right wheel
    g.generateTexture('player', 32, 32)
    g.clear()

    // Enemy – staircase obstacle
    g.fillStyle(0xff6b6b)
    for (let i = 0; i < 3; i++) {
      g.fillRect(i * 6, 18 - i * 6, 12, 6)
    }
    g.generateTexture('enemy', 32, 24)
    g.clear()

    // Bullet – small rectangle
    g.fillStyle(0xffffff).fillRect(0, 0, 8, 2)
    g.generateTexture('bullet', 8, 2)
    g.clear()

    // XP gem
    g.fillStyle(0x9cfba5).fillCircle(6, 6, 6)
    g.generateTexture('xp', 12, 12)
    g.destroy()
  }
  create() { this.scene.start('menu') }
}
