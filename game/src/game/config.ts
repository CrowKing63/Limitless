import Phaser from 'phaser'
import { Boot } from './scenes/Boot'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/Menu'

export const GAME_WIDTH = 320
export const GAME_HEIGHT = 180

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0d0f1c',
  parent: 'app',
  // Pixel-art friendly defaults
  pixelArt: true,
  roundPixels: true,
  // Disable smoothing at the renderer level as well
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: 3,
  },
  scene: [Boot, MenuScene, GameScene],
}
