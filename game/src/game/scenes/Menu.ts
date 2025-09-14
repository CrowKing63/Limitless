import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../config'

export class MenuScene extends Phaser.Scene {
  constructor() { super('menu') }

  create() {
    // Notify UI we're in menu (hide topbar controls)
    window.dispatchEvent(new CustomEvent('ui:inMenu'))

    // Background
    this.cameras.main.setBackgroundColor('#0d0f1c')

    // Central art: wheelchair vs stairs
    const cx = GAME_WIDTH / 2
    const cy = GAME_HEIGHT / 2 - 20
    const player = this.add.image(cx - 80, cy, 'player').setScale(2)
    const stairs = this.add.image(cx + 100, cy + 6, 'enemy').setScale(2)
    this.tweens.add({ targets: [player, stairs], angle: 2, yoyo: true, duration: 1200, repeat: -1, ease: 'Sine.inOut' })

    // Title & guide
    this.add.text(cx, cy - 130, 'Limitless Survivor', { color: '#e7e7ef', fontSize: '28px' }).setOrigin(0.5)
    const guide = [
      'Use the left panel to try your input mapping.',
      'Choose Click‑to‑Move or Pointer‑Follow.',
      'You can also test Face gestures, Scan mode, or Dwell click.',
      'When you are ready, press Start Run ▶ (bottom‑right).',
    ].join('\n')
    this.add.text(cx, cy - 90, guide, { color: '#b9b9c9', fontSize: '14px', align: 'center' }).setOrigin(0.5)

    // Menu buttons
    const beep = (freq = 880) => {
      const ctx = (this.sound as any).context as AudioContext | undefined
      if (!ctx) return
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.frequency.value = freq; gain.gain.setValueAtTime(0.1, ctx.currentTime)
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.08)
    }

    const makeBtn = (y: number, label: string, cb: () => void) => {
      const btn = this.add.text(cx, y, label, { color: '#0d0f1c', fontSize: '20px', backgroundColor: '#6ea8fe' })
        .setOrigin(0.5).setPadding(10, 8, 10, 8).setInteractive({ useHandCursor: true })
      btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#8fbaff' }))
      btn.on('pointerout',  () => btn.setStyle({ backgroundColor: '#6ea8fe' }))
      btn.on('pointerdown', () => { beep(900); cb() })
      return btn
    }

    makeBtn(cy + 90, 'Start', () => {
      // Start in practice mode (tutorial structure). Player can test mappings, then press Start Run in-game.
      window.dispatchEvent(new CustomEvent('ui:openSettings'))
      window.dispatchEvent(new CustomEvent('ui:practiceMode', { detail: { enabled: true } }))
      this.scene.start('game', { practice: true })
    })
  }
}
