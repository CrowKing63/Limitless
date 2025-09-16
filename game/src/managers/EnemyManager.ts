import Phaser from 'phaser';
import { Logger } from '../utils/logger';
import { GAME_WIDTH, WORLD_WIDTH, WORLD_HEIGHT } from '../game/config';

type Enemy = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
type EnemyType = 'stairs' | 'curb' | 'turn' | 'elev' | 'barrier' | 'sign';

export interface EnemyConfig {
  hpMul: number;
  enemySpeedMul: number;
  bulletSpeedMul: number;
  telegraphScale: number;
  stage: number;
  faceNudgeDistance: number;
}

export class EnemyManager {
  private scene: Phaser.Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private enemyBullets: Phaser.Physics.Arcade.Group;
  private config: EnemyConfig;
  private stageWeights: Record<number, Array<{ t: number, w: Record<string, number> }>>;

  constructor(
    scene: Phaser.Scene,
    enemies: Phaser.Physics.Arcade.Group,
    enemyBullets: Phaser.Physics.Arcade.Group,
    config: EnemyConfig
  ) {
    this.scene = scene;
    this.enemies = enemies;
    this.enemyBullets = enemyBullets;
    this.config = config;
    
    this.stageWeights = {
      1: [
        { t: 0, w: { stairs: 60, curb: 20, turn: 10, elev: 5, barrier: 5, sign: 0 } },
        { t: 30, w: { stairs: 45, curb: 20, turn: 15, elev: 10, barrier: 5, sign: 5 } },
        { t: 60, w: { stairs: 35, curb: 20, turn: 20, elev: 10, barrier: 5, sign: 10 } },
      ],
      2: [
        { t: 0, w: { stairs: 40, curb: 20, turn: 15, elev: 10, barrier: 10, sign: 5 } },
        { t: 45, w: { stairs: 30, curb: 15, turn: 20, elev: 15, barrier: 10, sign: 10 } },
      ],
      3: [
        { t: 0, w: { stairs: 30, curb: 15, turn: 20, elev: 15, barrier: 10, sign: 10 } },
        { t: 60, w: { stairs: 25, curb: 10, turn: 25, elev: 15, barrier: 10, sign: 15 } },
      ],
    };
  }

  spawnEnemy(runSecInit: number, runSecLeft: number): void {
    try {
      // Spawn at the edges
      const side = Phaser.Math.Between(0, 3);
      const margin = 30;
      let x = 0, y = 0;
      if (side === 0) { x = margin; y = Phaser.Math.Between(margin, WORLD_HEIGHT - margin); }
      else if (side === 1) { x = WORLD_WIDTH - margin; y = Phaser.Math.Between(margin, WORLD_HEIGHT - margin); }
      else if (side === 2) { y = margin; x = Phaser.Math.Between(margin, WORLD_WIDTH - margin); }
      else { y = WORLD_HEIGHT - margin; x = Phaser.Math.Between(margin, WORLD_WIDTH - margin); }

      let e = this.enemies.getFirstDead(false) as Enemy | null;
      // Decide enemy type
      const et = this.pickEnemyType(runSecInit, runSecLeft);
      const tex = et === 'stairs' ? 'enemy'
        : et === 'curb' ? 'enemy_curb'
        : et === 'turn' ? 'enemy_turn'
        : et === 'elev' ? 'enemy_elev'
        : et === 'barrier' ? 'enemy_barrier'
        : 'enemy_sign';
      if (!e) {
        e = this.enemies.create(x, y, tex) as Enemy;
      } else {
        e.enableBody(true, x, y, true, true);
        (e as any).setTexture && (e as any).setTexture(tex);
      }
      e.setData('type', et);
      e.setData('hp', Math.max(1, Math.round(this.enemyBaseHp(et) * this.config.hpMul)));
      e.setCircle(7);
      const hc = (window as any)._settings?.highContrast;
      if (hc && (e as any).setTint) (e as any).setTint(et === 'stairs' ? 0xff6b6b : et === 'curb' ? 0xd0d0d0 : 0xffbf00);
      const speed = Phaser.Math.Between(40, 80) * this.config.enemySpeedMul;
      e.setData('spd', speed);
      if (et === 'stairs') {
        // Initial nudge toward current player position; tracking continues in update()
        // We'll need player position passed in
      } else if (et === 'curb') {
        // Horizontal or vertical patrol
        const hv = Phaser.Math.Between(0, 1) === 0;
        if (hv) e.setVelocity(Phaser.Math.Between(0, 1) ? speed : -speed, 0);
        else e.setVelocity(0, Phaser.Math.Between(0, 1) ? speed : -speed);
        (e.body as Phaser.Physics.Arcade.Body).collideWorldBounds = true;
        (e.body as Phaser.Physics.Arcade.Body).bounce.set(1, 1);
      } else if (et === 'turn') {
        e.setVelocity(0, 0);
        e.setData('dashUntil', 0);
        e.setData('nextDash', this.scene.time.now + Phaser.Math.Between(400, 1000));
        (e.body as Phaser.Physics.Arcade.Body).collideWorldBounds = true;
        (e.body as Phaser.Physics.Arcade.Body).bounce.set(1, 1);
        e.setAngularVelocity(60);
      } else if (et === 'elev') {
        // Orbit around player, periodically changing radius
        const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
        e.setData('orbitAngle', ang);
        e.setData('orbitRadius', Phaser.Math.Between(30, 70));
        e.setVelocity(0, 0);
      } else if (et === 'barrier') {
        // Slow sweeper across the field
        const dir = Phaser.Math.Between(0, 1);
        e.setVelocity(dir ? 50 : -50, 0);
        (e.body as Phaser.Physics.Arcade.Body).collideWorldBounds = true;
        (e.body as Phaser.Physics.Arcade.Body).bounce.set(1, 1);
      } else if (et === 'sign') {
        e.setVelocity(0, 0);
        e.setData('nextShot', this.scene.time.now + Phaser.Math.Between(600, 1100));
      }
    } catch (error) {
      Logger.error('Failed to spawn enemy', error as Error);
    }
  }

  updateEnemies(
    playerX: number, 
    playerY: number,
    timeNow: number
  ): void {
    try {
      const list = this.enemies.getChildren() as Enemy[];
      for (const e of list) {
        if (!e.active) continue;
        const et = (e.getData('type') as string) || 'stairs';
        if (et === 'stairs') {
          const dx = playerX - e.x;
          const dy = playerY - e.y;
          const len = Math.hypot(dx, dy) || 1;
          const spd = (e.getData('spd') as number) || 60;
          e.setVelocity((dx / len) * spd, (dy / len) * spd);
        } else if (et === 'curb') {
          // bounce patrol handled by physics; keep current velocity
        } else if (et === 'turn') {
          const dashUntil = (e.getData('dashUntil') as number) || 0;
          const nextDash = (e.getData('nextDash') as number) || 0;
          // Telegraph before dash
          const tele = ((window as any)._settings?.telegraphMs ?? 200) * this.config.telegraphScale;
          const bold = !!(window as any)._settings?.telegraphBold;
          if (timeNow + tele >= nextDash && timeNow < nextDash && timeNow >= dashUntil && !e.getData('tele')) {
            const ring = this.scene.add.circle(e.x, e.y, 8, 0xffbf00, bold ? 0.35 : 0.2);
            this.scene.tweens.add({ targets: ring, scale: 1.6, alpha: 0, duration: tele, onComplete: () => ring.destroy() });
            e.setData('tele', 1); this.scene.time.delayedCall(220, () => e.setData('tele', 0));
          }
          if (timeNow >= nextDash && timeNow >= dashUntil) {
            const dx = playerX - e.x;
            const dy = playerY - e.y;
            const ang = Math.atan2(dy, dx);
            const spd = 150;
            this.scene.physics.velocityFromRotation(ang, spd, (e.body as Phaser.Physics.Arcade.Body).velocity);
            e.setData('dashUntil', timeNow + 280);
            e.setData('nextDash', timeNow + 1200 + Phaser.Math.Between(-200, 200));
            e.setAngularVelocity(180);
          } else if (timeNow >= dashUntil) {
            e.setVelocity(0, 0);
            e.setAngularVelocity(60);
          }
        } else if (et === 'elev') {
          // Orbit target around player
          const ang = (e.getData('orbitAngle') as number) || 0;
          let rad = (e.getData('orbitRadius') as number) || 50;
          const angNext = ang + 0.03;
          // slight breathing radius
          rad += Math.sin(timeNow / 600) * 0.1;
          const tx = playerX + Math.cos(angNext) * rad;
          const ty = playerY + Math.sin(angNext) * rad;
          const dx = tx - e.x, dy = ty - e.y;
          const len = Math.hypot(dx, dy) || 1;
          const spd = 60;
          e.setVelocity((dx / len) * spd, (dy / len) * spd);
          e.setData('orbitAngle', angNext);
          e.setData('orbitRadius', rad);
        } else if (et === 'barrier') {
          // Keep sweeping; physics handles bounce
        } else if (et === 'sign') {
          const ns = (e.getData('nextShot') as number) || 0;
          if (timeNow >= ns) {
            // Telegraph small flash
            const tele = (((window as any)._settings?.telegraphMs ?? 200) * this.config.telegraphScale) * 0.6;
            const bold = !!(window as any)._settings?.telegraphBold;
            const ring = this.scene.add.circle(e.x, e.y, 5, 0xff0000, bold ? 0.4 : 0.25);
            this.scene.tweens.add({ targets: ring, alpha: 0, duration: tele, onComplete: () => ring.destroy() });
            this.enemyShootAt(e.x, e.y, playerX, playerY);
            e.setData('nextShot', timeNow + Phaser.Math.Between(800, 1300));
          }
        }
      }
    } catch (error) {
      Logger.error('Failed to update enemies', error as Error);
    }
  }

  enemyShootAt(sx: number, sy: number, tx: number, ty: number): void {
    try {
      const bold = !!(window as any)._settings?.projectileBold;
      const key = bold && this.scene.textures.exists('enemy_bullet_bold') ? 'enemy_bullet_bold' : 'enemy_bullet';
      let b = this.enemyBullets.getFirstDead(false) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody | null;
      if (!b) b = this.enemyBullets.create(sx, sy, key) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
      else { b.enableBody(true, sx, sy, true, true); b.setTexture(key); }
      const ang = Math.atan2(ty - sy, tx - sx);
      this.scene.physics.velocityFromRotation(ang, Math.round(160 * this.config.bulletSpeedMul), b.body.velocity);
      this.scene.time.delayedCall(2500, () => b && b.disableBody(true, true));
    } catch (error) {
      Logger.error('Failed to shoot enemy bullet', error as Error);
    }
  }

  private pickEnemyType(runSecInit: number, runSecLeft: number): EnemyType {
    const elapsed = runSecInit - runSecLeft;
    const table = this.stageWeights[this.config.stage] || this.stageWeights[1];
    let current = table[0].w;
    for (const row of table) { if (elapsed >= row.t) current = row.w; }
    const entries = Object.entries(current) as Array<[any, number]>;
    const total = entries.reduce((a, [,v]) => a+v, 0);
    let r = Math.random() * total;
    for (const [k, v] of entries) { r -= v; if (r <= 0) return k as EnemyType; }
    return 'stairs';
  }

  private enemyBaseHp(type: string): number {
    const s = this.config.stage;
    const bonus = Math.floor((s - 1) * 0.5);
    switch (type) {
      case 'stairs': return 1 + bonus;
      case 'curb': return 2 + bonus;
      case 'turn': return 3 + bonus;
      case 'elev': return 3 + bonus;
      case 'barrier': return 4 + bonus;
      case 'sign': return 2 + bonus;
      default: return 1 + bonus;
    }
  }
}