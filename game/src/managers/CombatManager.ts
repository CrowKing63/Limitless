import Phaser from 'phaser';
import { Logger } from '../utils/logger';
import { Cache } from '../utils/cache';
import { EnemyManager } from './EnemyManager';

type Enemy = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

export interface CombatConfig {
  damageToPlayer: number;
  telegraphScale: number;
  attackRadius: number;
}

export class CombatManager {
  private scene: Phaser.Scene;
  private projectiles: Phaser.Physics.Arcade.Group;
  private xpOrbs: Phaser.Physics.Arcade.Group;
  private config: CombatConfig;
  private nearestEnemyCache: Cache<{ x: number; y: number } | null>;

  constructor(
    scene: Phaser.Scene,
    projectiles: Phaser.Physics.Arcade.Group,
    xpOrbs: Phaser.Physics.Arcade.Group,
    config: CombatConfig
  ) {
    this.scene = scene;
    this.projectiles = projectiles;
    this.xpOrbs = xpOrbs;
    this.config = config;
    this.nearestEnemyCache = new Cache(100); // Cache for 100ms
  }

  findNearestEnemy(
    enemies: Phaser.Physics.Arcade.Group,
    playerX: number,
    playerY: number
  ): { x: number; y: number } | null {
    try {
      const cacheKey = `${playerX},${playerY}`;
      const cached = this.nearestEnemyCache.get(cacheKey);
      if (cached) return cached;

      const list = enemies.getChildren() as Enemy[];
      let best: Enemy | null = null;
      let bestD2 = Infinity;
      for (const e of list) {
        if (!e.active) continue;
        const dx = e.x - playerX;
        const dy = e.y - playerY;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = e; }
      }

      const result = best ? { x: best.x, y: best.y } : null;
      this.nearestEnemyCache.set(cacheKey, result);
      return result;
    } catch (error) {
      Logger.error('Failed to find nearest enemy', error as Error);
      return null;
    }
  }

  doAttack(
    playerX: number,
    playerY: number,
    enemies: Phaser.Physics.Arcade.Group,
    projCount: number,
    projSpeed: number,
    lastAim: number,
    playSfx: (freq: number) => void
  ): number {
    try {
      playSfx(440);
      // Auto-aim: pick nearest enemy; if none, use lastAim
      const target = this.findNearestEnemy(enemies, playerX, playerY);
      let aimAngle = lastAim;
      if (target) {
        aimAngle = Math.atan2(target.y - playerY, target.x - playerX);
      }
      const spread = Phaser.Math.DegToRad(14);
      for (let i = 0; i < projCount; i++) {
        const offset = (i - (projCount - 1) / 2) * spread;
        const angle = aimAngle + offset;
        let b = this.projectiles.getFirstDead(false) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody | null;
        if (!b) {
          b = this.projectiles.create(playerX, playerY, 'bullet') as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
        } else {
          b.enableBody(true, playerX, playerY, true, true);
          b.setTexture('bullet');
        }
        b.setRotation(angle);
        this.scene.physics.velocityFromRotation(angle, projSpeed, b.body.velocity);
        this.scene.time.delayedCall(1500, () => b!.disableBody(true, true));
      }
      return aimAngle;
    } catch (error) {
      Logger.error('Failed to perform attack', error as Error);
      return lastAim;
    }
  }

  damageEnemy(e: Enemy, dmg: number, tweens: Phaser.Tweens.TweenManager): boolean {
    try {
      const hp = (e.getData('hp') as number) ?? 1;
      const next = hp - dmg;
      if (next <= 0) {
        return true; // Enemy should be killed
      }
      e.setData('hp', next);
      // brief flash
      tweens.add({ targets: e, alpha: 0.5, yoyo: true, duration: 80, repeat: 0 });
      return false;
    } catch (error) {
      Logger.error('Failed to damage enemy', error as Error);
      return false;
    }
  }

  dropXP(x: number, y: number, value: number = 1, isPractice: boolean): void {
    try {
      if (isPractice) return;
      let orb = this.xpOrbs.getFirstDead(false) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody | null;
      if (!orb) {
        orb = this.xpOrbs.create(x, y, 'xp') as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
      } else {
        orb.enableBody(true, x, y, true, true);
        orb.setTexture('xp');
      }
      orb.setData('value', value);
      orb.setVelocity(0, 0);
    } catch (error) {
      Logger.error('Failed to drop XP', error as Error);
    }
  }

  radialBlast(
    playerX: number,
    playerY: number,
    enemies: Phaser.Physics.Arcade.Group,
    attackRadius: number,
    playSfx: (freq: number) => void
  ): void {
    try {
      const circle = this.scene.add.circle(playerX, playerY, 6, 0x6ea8fe, 0.18);
      this.scene.tweens.add({
        targets: circle,
        radius: attackRadius * 1.4,
        alpha: 0,
        duration: 200,
        ease: 'Quad.easeOut',
        onComplete: () => circle.destroy()
      });
      playSfx(520);
      const list = enemies.getChildren() as Phaser.GameObjects.Image[];
      for (const e of list) {
        const dx = e.x - playerX;
        const dy = e.y - playerY;
        if (dx * dx + dy * dy <= (attackRadius * 1.4) * (attackRadius * 1.4)) {
          // Damage enemy
          // This would need to be handled by the caller or EnemyManager
        }
      }
    } catch (error) {
      Logger.error('Failed to perform radial blast', error as Error);
    }
  }

  cleanup(): void {
    this.nearestEnemyCache.clear();
  }
}