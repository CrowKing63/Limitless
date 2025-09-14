import Phaser from 'phaser'
import { Boot } from './scenes/Boot'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/Menu'

export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0d0f1c',
  parent: 'app',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [Boot, MenuScene, GameScene],
}
