import Phaser from 'phaser';
import { Logger } from '../utils/logger';
import { GAME_WIDTH } from '../game/config';

export interface UIState {
  runSecLeft: number;
  runSecInit: number;
  stage: number;
  hp: number;
  level: number;
  xp: number;
  xpToNext: number;
  kills: number;
  isPractice: boolean;
  speed: number;
  projSpeed: number;
  attackCooldown: number;
  projCount: number;
  hasMagnet: boolean;
  magnetRadius: number;
  magnetLv: number;
  hasBlast: boolean;
  attackRadius: number;
  blastLv: number;
}

export class UIManager {
  private scene: Phaser.Scene;
  private uiText: Phaser.GameObjects.Text;
  private timeBar: Phaser.GameObjects.Graphics;
  private buildHUD: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    uiText: Phaser.GameObjects.Text,
    timeBar: Phaser.GameObjects.Graphics,
    buildHUD: Phaser.GameObjects.Text
  ) {
    this.scene = scene;
    this.uiText = uiText;
    this.timeBar = timeBar;
    this.buildHUD = buildHUD;
  }

  updateHUD(state: UIState): void {
    try {
      const timer = this.formatTime(Math.max(0, state.runSecLeft));
      const practice = state.isPractice ? ' PRACTICE' : '';
      this.uiText.setText(`Stage ${state.stage}${practice}  |  Time ${timer}\nHP ${state.hp}  Lv ${state.level}  XP ${state.xp}/${state.xpToNext}  Kills ${state.kills}`);
      this.drawTimeBar(state.runSecLeft, state.runSecInit);
    } catch (error) {
      Logger.error('Failed to update HUD', error as Error);
    }
  }

  updateBuildHUD(state: UIState): void {
    try {
      if (!this.buildHUD) return;
      const shotsPerSec = (1000 / state.attackCooldown).toFixed(2);
      const lines: string[] = [];
      lines.push(`Proj: x${state.projCount}  Spd: ${state.projSpeed}`);
      lines.push(`Rate: ${shotsPerSec}/s  CD: ${state.attackCooldown}ms`);
      lines.push(`Move: ${state.speed}`);
      if (state.hasMagnet) lines.push(`Magnet: r=${Math.round(state.magnetRadius)} (${Math.max(1, state.magnetLv)})`);
      if (state.hasBlast) lines.push(`Blast: r=${Math.round(state.attackRadius)} (${Math.max(1, state.blastLv)})`);
      this.buildHUD.setText(lines.join('\n'));
    } catch (error) {
      Logger.error('Failed to update build HUD', error as Error);
    }
  }

  showHint(text: string): void {
    try {
      // Screen-anchored hint
      const t = this.scene.add.text(GAME_WIDTH / 2, 24, text, { color: '#e7e7ef', fontSize: '16px' })
        .setOrigin(0.5, 0).setScrollFactor(0);
      this.scene.time.delayedCall(4500, () => t.destroy());
    } catch (error) {
      Logger.error('Failed to show hint', error as Error);
    }
  }

  private formatTime(sec: number): string {
    try {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    } catch (error) {
      Logger.error('Failed to format time', error as Error);
      return '0:00';
    }
  }

  private drawTimeBar(runSecLeft: number, runSecInit: number): void {
    try {
      if (!this.timeBar) return;
      const w = Math.min(320, GAME_WIDTH - 16), h = 10;
      const x = GAME_WIDTH / 2 - w / 2;
      const y = 6;
      const t = Phaser.Math.Clamp(runSecLeft / runSecInit, 0, 1);
      this.timeBar.clear();
      this.timeBar.fillStyle(0x23274a).fillRect(x, y, w, h);
      this.timeBar.fillStyle(0x6ea8fe).fillRect(x, y, Math.floor(w * (1 - t)), h);
    } catch (error) {
      Logger.error('Failed to draw time bar', error as Error);
    }
  }
}