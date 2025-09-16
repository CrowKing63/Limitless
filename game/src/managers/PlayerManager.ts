import Phaser from 'phaser';
import { Logger } from '../utils/logger';
import { VirtualInput } from '../input/VirtualInput';

export interface PlayerStats {
  speed: number;
  level: number;
  xp: number;
  xpToNext: number;
  attackRadius: number;
  attackCooldown: number;
  projSpeed: number;
  projCount: number;
  hp: number;
  fireRateLv: number;
  projLv: number;
  speedLv: number;
  magnetLv: number;
  blastLv: number;
  hasMagnet: boolean;
  magnetRadius: number;
  hasBlast: boolean;
}

export class PlayerManager {
  private scene: Phaser.Scene;
  private player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private inputLayer: VirtualInput;
  private stats: PlayerStats;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    inputLayer: VirtualInput,
    initialStats: PlayerStats
  ) {
    this.scene = scene;
    this.player = player;
    this.inputLayer = inputLayer;
    this.stats = initialStats;
  }

  update(playerX: number, playerY: number, cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    try {
      // Virtual input
      const dir = this.inputLayer.getMoveVector(playerX, playerY);
      // Allow arrow keys for dev testing
      if (cursors.left.isDown) dir.x = -1;
      else if (cursors.right.isDown) dir.x = 1;
      if (cursors.up.isDown) dir.y = -1;
      else if (cursors.down.isDown) dir.y = 1;

      this.player.setVelocity(
        dir.x * this.stats.speed * this.inputLayer.getSpeedMultiplier(),
        dir.y * this.stats.speed * this.inputLayer.getSpeedMultiplier()
      );

      // Directional animation
      if (dir.lengthSq() > 0) {
        const ax = Math.abs(dir.x), ay = Math.abs(dir.y);
        let key = 'player-down';
        let flipX = false;
        if (ax > ay) {
          if (dir.x > 0) { 
            key = this.scene.anims.exists('player-right') ? 'player-right' : 'player-left'; 
            flipX = !this.scene.anims.exists('player-right');
          } else { 
            key = 'player-left'; 
            flipX = false; 
          }
        } else {
          key = dir.y > 0 ? 'player-down' : 'player-up';
        }
        if (this.scene.anims.exists(key)) this.player.anims.play(key, true);
        else if (this.scene.anims.exists('player-walk')) this.player.anims.play('player-walk', true);
        this.player.setFlipX(flipX);
      } else {
        this.player.anims.stop();
      }
    } catch (error) {
      Logger.error('Failed to update player', error as Error);
    }
  }

  // Getters and setters for player stats
  getStats(): PlayerStats {
    return { ...this.stats };
  }

  setStats(stats: Partial<PlayerStats>): void {
    this.stats = { ...this.stats, ...stats };
  }

  getSpeed(): number {
    return this.stats.speed;
  }

  getLevel(): number {
    return this.stats.level;
  }

  getXp(): number {
    return this.stats.xp;
  }

  getXpToNext(): number {
    return this.stats.xpToNext;
  }

  getHp(): number {
    return this.stats.hp;
  }

  getProjCount(): number {
    return this.stats.projCount;
  }

  getProjSpeed(): number {
    return this.stats.projSpeed;
  }

  getAttackCooldown(): number {
    return this.stats.attackCooldown;
  }

  getAttackRadius(): number {
    return this.stats.attackRadius;
  }

  getHasMagnet(): boolean {
    return this.stats.hasMagnet;
  }

  getMagnetRadius(): number {
    return this.stats.magnetRadius;
  }

  getHasBlast(): boolean {
    return this.stats.hasBlast;
  }

  incrementLevel(): void {
    this.stats.level += 1;
  }

  incrementXp(amount: number): void {
    this.stats.xp += amount;
  }

  incrementKills(): void {
    // This would need to be handled by the GameScene or a separate combat manager
  }

  decrementHp(amount: number): void {
    this.stats.hp = Math.max(0, this.stats.hp - amount);
  }

  // Upgrade methods
  upgradeFireRate(): void {
    this.stats.attackCooldown = Math.max(200, Math.round(this.stats.attackCooldown * 0.8));
    this.stats.fireRateLv += 1;
  }

  upgradeProjectile(): void {
    this.stats.projCount = Math.min(5, this.stats.projCount + 1);
    this.stats.projLv += 1;
  }

  upgradeSpeed(): void {
    this.stats.speed = Math.min(400, Math.round(this.stats.speed * 1.1));
    this.stats.speedLv += 1;
  }

  upgradeMagnet(): void {
    this.stats.magnetRadius = Math.min(300, this.stats.magnetRadius * 1.25);
    this.stats.magnetLv += 1;
  }

  upgradeBlast(): void {
    this.stats.attackRadius = Math.min(400, this.stats.attackRadius * 1.2);
    this.stats.blastLv += 1;
  }
}