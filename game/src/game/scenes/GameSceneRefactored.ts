import Phaser from 'phaser';
import { GAME_WIDTH, WORLD_WIDTH, WORLD_HEIGHT } from '../config';
import { VirtualInput } from '../../input/VirtualInput';
import { openLevelUp } from '../../ui/overlays';
import { loadProgress } from '../../state/progress';
import { loadRewards } from '../../state/rewards';
import { clearRunState, loadRunState, saveRunState, type RunBuild, DEFAULT_MAX_HP } from '../../state/run';
import { Logger } from '../../utils/logger';
import { EnemyManager, type EnemyConfig } from '../../managers/EnemyManager';
import { PlayerManager, type PlayerStats } from '../../managers/PlayerManager';
import { CombatManager, type CombatConfig } from '../../managers/CombatManager';
import { UIManager, type UIState } from '../../managers/UIManager';

type Enemy = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private inputLayer!: VirtualInput;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private enemies!: Phaser.Physics.Arcade.Group;
  private xpOrbs!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private uiText!: Phaser.GameObjects.Text;
  private bgLayer?: Phaser.Tilemaps.TilemapLayer;

  // Managers
  private enemyManager!: EnemyManager;
  private playerManager!: PlayerManager;
  private combatManager!: CombatManager;
  private uiManager!: UIManager;

  // Timer events
  private attackEvt?: Phaser.Time.TimerEvent;
  private spawnEvt?: Phaser.Time.TimerEvent;
  private runTimerEvt?: Phaser.Time.TimerEvent;

  // Game state
  private inLevelUp = false;
  private runOver = false;
  private stage = 1;
  private kills = 0;
  private practiceActive = false;
  private isPractice = false;
  private lastAim = 0;
  private timeBar!: Phaser.GameObjects.Graphics;
  private buildHUD!: Phaser.GameObjects.Text;
  private runSecLeft = 90;
  private runSecInit = 90;

  // Regeneration tracking
  private regenAccumulator = 0;
  private lastDamageAt = 0;
  private readonly regenDelayMs = 2500;
  private readonly regenIntervalMs = 1000;

  // Performance tracking
  private perfAccum = 0;
  private perfFrames = 0;
  private baseSpawnDelay = 1500;
  private currentSpawnDelay = 1500;
  private lowSpec = false;

  // Boss fields
  private bossActive: boolean = false;

  constructor() {
    super('game');
  }

  init(data: any) {
    this.isPractice = !!data?.practice;
  }

  create() {
    try {
      // Pixel-perfect camera
      this.cameras.main.setRoundPixels(true);
      // Reset per-run state to ensure clean restart between stages
      this.resetGameState();

      // Stage / meta
      const prog = loadProgress();
      this.stage = Math.max(1, (prog as any)?.currentStage || (prog as any)?.highestUnlocked || 1);
      // Short runs; extend slightly with stage
      this.runSecInit = Math.min(180, 90 + (this.stage - 1) * 15);
      this.runSecLeft = this.runSecInit;
      // World bounds and camera follow for a larger map
      this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Background tilemap (prefers large dynamic map if Tiled is too small)
      this.createBackground();
      this.applyStageTheme();

      // Player (16x16 base, use spritesheet if available)
      this.createPlayer();

      // Camera tracks the player
      this.cameras.main.startFollow(this.player, true, 1, 1);

      // Input
      // Clear any residual input listeners from prior runs
      this.input.removeAllListeners();
      this.inputLayer = new VirtualInput(this);
      this.inputLayer.attach();
      // Ensure movement mode matches persisted settings
      this.inputLayer.setMode((window as any)._settings?.movementMode || 'click');
      this.cursors = this.input.keyboard!.createCursorKeys();

      // Voice commands
      this.setupVoiceCommands();

      // Enemies + XP groups
      this.enemies = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image });
      this.xpOrbs = this.physics.add.group({ allowGravity: false });
      this.projectiles = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image });
      this.enemyBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image });
      for (let i = 0; i < 6; i++) this.spawnEnemy();

      // Damage on touch (with brief i-frames)
      this.setupCollisions();

      // Difficulty presets + stage scaling
      this.setupDifficultyAndStageScaling();

      // Tutorial / practice signals (bind once)
      this.setupTutorialSignals();

      // Short run timer (disabled in practice)
      this.setupRunTimer();

      // Auto-attack
      this.scheduleAttack();

      // Rewards
      this.applyRewards();

      // If continuing to next stage, apply previous run build
      this.applyRunStateIfAny();
      this.updateBuildHUD();

      // Click feedback
      this.setupClickFeedback();

      // Pause key
      this.setupPauseKeys();

      // UI
      this.setupUI();

      // Practice mode
      this.setupPracticeMode();
    } catch (error) {
      Logger.error('Failed to create GameScene', error as Error);
    }
  }

  private resetGameState(): void {
    this.runOver = false;
    this.inLevelUp = false;
    this.kills = 0;
    if (this.playerManager) {
      this.playerManager.setInvulnUntil(0);
      this.playerManager.restoreFullHealth();
    }
    this.practiceActive = false;
    this.regenAccumulator = 0;
    this.lastDamageAt = this.time.now;
    if (this.spawnEvt) { this.spawnEvt.remove(false); this.spawnEvt = undefined; }
    if (this.attackEvt) { this.attackEvt.remove(false); this.attackEvt = undefined; }
    this.physics.world.isPaused = false;
    this.input.enabled = true;
  }

  private createPlayer(): void {
    if (this.textures.exists('player_sheet')) {
      this.player = this.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'player_sheet', 0);
      if (this.anims.exists('player-down')) this.player.play('player-down');
      else if (this.anims.exists('player-walk')) this.player.play('player-walk');
    } else {
      this.player = this.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'player', 0);
    }
    // Smaller on-screen character to open up space
    this.player.setScale(1);
    this.player.setCircle(8);
    this.player.setCollideWorldBounds(true);
    if ((window as any)._settings?.highContrast) this.player.setTint(0xffbf00);

    // Initialize player manager
    const initialStats: PlayerStats = {
      speed: 160,
      level: 1,
      xp: 0,
      xpToNext: 5,
      attackRadius: 100,
      attackCooldown: 800,
      projSpeed: 300,
      projCount: 1,
      hp: DEFAULT_MAX_HP,
      maxHp: DEFAULT_MAX_HP,
      fireRateLv: 0,
      projLv: 0,
      speedLv: 0,
      magnetLv: 0,
      blastLv: 0,
      hasMagnet: false,
      magnetRadius: 0,
      hasBlast: false,
      invulnUntil: 0
    };
    this.playerManager = new PlayerManager(this, this.player, this.inputLayer, initialStats);
  }

  private setupVoiceCommands(): void {
    window.addEventListener('voice:command', (e: Event) => {
      const detail = (e as CustomEvent).detail as any;
      if (!detail) return;
      if (detail.type === 'move') {
        const dist = (window as any)._settings?.faceNudgeDistance ?? 160;
        this.inputLayer.nudgeTowards(detail.dir, dist, this.player.x, this.player.y);
      } else if (detail.type === 'stop') {
        this.inputLayer.stop();
      }
    });
  }

  private setupCollisions(): void {
    // Damage on touch (with brief i-frames)
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.onHitEnemy(e as Enemy));

    // Collect XP
    this.physics.add.overlap(this.player, this.xpOrbs, (_p, orb) => {
      const o = orb as Phaser.Types.Physics.Arcade.ImageWithDynamicBody & { value?: number };
      this.playerManager.incrementXp(o.getData('value') ?? 1);
      o.disableBody(true, true);
      this.playSfx(660);
      this.checkLevelUp();
      this.updateHUD();
    });

    this.physics.add.overlap(this.projectiles, this.enemies, (proj, e) => {
      const p = proj as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
      p.disableBody(true, true);
      this.damageEnemy(e as Enemy, 1);
    });
    // Enemy bullets hit player
    this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) => {
      const bb = b as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
      bb.disableBody(true, true);
      this.onBulletHitPlayer();
    });
  }

  private setupDifficultyAndStageScaling(): void {
    const diff = (window as any)._settings?.difficulty || 'standard';
    let spawnDelay = 1500;
    let enemySpeedMul = 1;
    let hpMul = 1;
    let bulletSpeedMul = 1;
    let telegraphScale = 1;
    let damageToPlayer = 1;

    if (diff === 'relaxed') {
      spawnDelay = 2200;
      enemySpeedMul = 0.85;
      hpMul = 0.85;
      bulletSpeedMul = 0.9;
      telegraphScale = 1.2;
      damageToPlayer = 1;
    } else if (diff === 'intense') {
      spawnDelay = 1000;
      enemySpeedMul = 1.2;
      hpMul = 1.15;
      bulletSpeedMul = 1.15;
      telegraphScale = 0.85;
      damageToPlayer = 2;
    } else {
      hpMul = 1.0;
      bulletSpeedMul = 1.0;
      telegraphScale = 1.0;
      damageToPlayer = 1;
    }
    enemySpeedMul *= 1 + (this.stage - 1) * 0.08;
    spawnDelay = Math.max(700, Math.round(spawnDelay - (this.stage - 1) * 120));

    // Spawn loop (track baseline/current for perf auto-tuning)
    this.baseSpawnDelay = spawnDelay;
    this.setSpawnDelay(spawnDelay);

    // Initialize enemy manager
    const enemyConfig: EnemyConfig = {
      hpMul,
      enemySpeedMul,
      bulletSpeedMul,
      telegraphScale,
      stage: this.stage,
      faceNudgeDistance: (window as any)._settings?.faceNudgeDistance ?? 160
    };
    this.enemyManager = new EnemyManager(this, this.enemies, this.enemyBullets, enemyConfig);

    // Initialize combat manager
    const combatConfig: CombatConfig = {
      damageToPlayer,
      telegraphScale,
      attackRadius: this.playerManager.getAttackRadius()
    };
    this.combatManager = new CombatManager(this, this.projectiles, this.xpOrbs, combatConfig);
  }

  private setupTutorialSignals(): void {
    window.addEventListener('tutorial:practice', () => {
      this.practiceActive = true;
      if (this.spawnEvt) this.spawnEvt.paused = true;
      this.clearEnemies();
      this.spawnPracticePack(6);
      this.uiManager.showHint('연습 모드: 적 6마리 처치하면 본 게임 시작');
    });
    window.addEventListener('tutorial:play', () => {
      this.practiceActive = false;
      if (this.spawnEvt) this.spawnEvt.paused = false;
      localStorage.setItem('limitless:tutorialSeen', '1');
      this.uiManager.showHint('게임 시작!');
    });
  }

  private setupRunTimer(): void {
    // Short run timer (disabled in practice)
    if (!this.isPractice) {
      this.runTimerEvt = this.time.addEvent({
        delay: 1000, loop: true, callback: () => {
          if (this.runOver) return;
          this.runSecLeft -= 1;
          if (this.runSecLeft <= 0) this.endRun('time');
          this.updateHUD();
        }
      });
    }
  }

  private setupClickFeedback(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const fx = this.add.circle(p.worldX, p.worldY, 6, 0xffffff, 0.3);
      this.tweens.add({ targets: fx, radius: 20, alpha: 0, duration: 200, onComplete: () => fx.destroy() });
      this.playSfx(880);
    });
  }

  private setupPauseKeys(): void {
    this.input.keyboard!.on('keydown-ESC', () => this.openPause());
    this.input.keyboard!.on('keydown-P', () => this.openPause());
  }

  private setupUI(): void {
    this.uiText = this.add.text(8, 8, '', { color: '#e7e7ef', fontSize: '14px', fontFamily: 'Galmuri11' }).setScrollFactor(0);
    // Improve readability with a thin outline and shadow
    this.uiText.setStroke('#000', 3).setShadow(0, 1, '#000', 2, true, true);
    // Time progress bar (top center)
    this.timeBar = this.add.graphics().setScrollFactor(0);
    // Build HUD (top-right)
    this.buildHUD = this.add.text(GAME_WIDTH - 8, 8, '', { color: '#b9b9c9', fontSize: '12px', align: 'right', fontFamily: 'Galmuri11' }).setOrigin(1, 0).setScrollFactor(0);
    this.buildHUD.setStroke('#000', 2).setShadow(0, 1, '#000', 2, true, true);
    this.updateHUD();
  }

  private setupPracticeMode(): void {
    if (this.isPractice) {
      this.uiManager.showHint('Practice: adjust left panel. Press Start Run in the sidebar when ready.');
      window.dispatchEvent(new CustomEvent('ui:practiceMode', { detail: { enabled: true } }));
      // Re-open settings after scene starts to ensure visibility on Safari
      this.time.delayedCall(50, () => window.dispatchEvent(new CustomEvent('ui:openSettings')));
      const onStart = () => {
        window.removeEventListener('ui:start_run', onStart as any);
        this.startRealRunNow();
      };
      window.addEventListener('ui:start_run', onStart as any);
      this.events.once('shutdown', () => window.removeEventListener('ui:start_run', onStart as any));
    } else {
      this.uiManager.showHint('Click to move. Press Esc for Pause.');
      window.dispatchEvent(new CustomEvent('ui:practiceMode', { detail: { enabled: false } }));
    }

    // Initialize UI manager
    this.uiManager = new UIManager(this, this.uiText, this.timeBar, this.buildHUD);
  }

  private spawnEnemy(): void {
    this.enemyManager.spawnEnemy(90, 90); // Default values for now
  }

  private createBackground(): void {
    if (!this.textures.exists('tiles')) return;
    // Prefer Tiled only if it is at least as large as our world
    const tm = (this.cache.tilemap as any).get('level1');
    if (tm) {
      const map = this.make.tilemap({ key: 'level1' });
      const tiles = map.addTilesetImage('tiles');
      if (tiles) {
        const pxW = (map as any).widthInPixels ?? (map.width * map.tileWidth);
        const pxH = (map as any).heightInPixels ?? (map.height * map.tileHeight);
        if (pxW >= WORLD_WIDTH && pxH >= WORLD_HEIGHT) {
          const layer = map.createLayer(0, tiles, 0, 0);
          if (layer) { layer.setDepth(-10); this.bgLayer = layer; }
          return;
        }
      }
    }
    const tw = 16, th = 16;
    const cols = Math.ceil(WORLD_WIDTH / tw);
    const rows = Math.ceil(WORLD_HEIGHT / th);
    const data: number[][] = [];
    for (let y = 0; y < rows; y++) {
      const row: number[] = [];
      for (let x = 0; x < cols; x++) {
        // 0: base grass, 1: border, 2: sprinkled stones
        let idx = 0;
        if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) idx = 1;
        else if (((x * 29 + y * 53) % 17) === 0) idx = 2;
        row.push(idx);
      }
      data.push(row);
    }
    const map = this.make.tilemap({ data, tileWidth: tw, tileHeight: th });
    const tiles = map.addTilesetImage('tiles');
    if (tiles) {
      const layer = map.createLayer(0, tiles, 0, 0);
      if (layer) { layer.setDepth(-10); this.bgLayer = layer; }
    }
  }

  private applyStageTheme(): void {
    const pal = ((window as any)._settings?.palette as ('default' | 'high' | 'mono')) || 'default';
    const table: Record<'default' | 'high' | 'mono', Record<number, { bg: number, tint: number }>> = {
      default: {
        1: { bg: 0x0d0f1c, tint: 0xffffff },
        2: { bg: 0x0f0f14, tint: 0xcde9ff },
        3: { bg: 0x110d14, tint: 0xffe7cd },
      },
      high: {
        1: { bg: 0x000000, tint: 0xffffff },
        2: { bg: 0x000000, tint: 0xfff4c1 },
        3: { bg: 0x000000, tint: 0xc1e7ff },
      },
      mono: {
        1: { bg: 0x000000, tint: 0xffffff },
        2: { bg: 0x000000, tint: 0xdddddd },
        3: { bg: 0x000000, tint: 0xcccccc },
      }
    };
    const t = (table[pal][this.stage] || table[pal][1]);
    this.cameras.main.setBackgroundColor(t.bg as any);
    if (this.bgLayer) this.bgLayer.setTint(t.tint);
  }

  private scheduleAttack(): void {
    if (this.attackEvt) this.attackEvt.remove(false);
    this.attackEvt = this.time.addEvent({
      delay: this.playerManager.getAttackCooldown(),
      loop: true,
      callback: () => this.doAttack()
    });
  }

  private doAttack(): void {
    if (this.inLevelUp) return;
    this.lastAim = this.combatManager.doAttack(
      this.player.x,
      this.player.y,
      this.enemies,
      this.playerManager.getProjCount(),
      this.playerManager.getProjSpeed(),
      this.lastAim,
      this.playSfx.bind(this)
    );
  }

  private damageEnemy(e: Enemy, dmg: number = 1): void {
    const shouldKill = this.combatManager.damageEnemy(e, dmg, this.tweens);
    if (shouldKill) {
      this.killEnemy(e);
    }
  }

  private killEnemy(e: Enemy): void {
    this.combatManager.dropXP(e.x, e.y, 1, this.isPractice);
    this.spawnHitFx(e.x, e.y);
    this.kills += 1;
    e.disableBody(true, true);
    this.playSfx(330);
    if (this.practiceActive && this.enemies.countActive(true) === 0) {
      this.time.delayedCall(300, () => window.dispatchEvent(new CustomEvent('tutorial:play')));
    }
  }

  private spawnHitFx(x: number, y: number): void {
    if (!this.anims.exists('fx-hit')) return;
    const s = this.add.sprite(x, y, 'fx_hit_0').setScale(2);
    s.anims.play('fx-hit');
    s.on('animationcomplete', () => s.destroy());
  }

  private checkLevelUp(): void {
    if (this.isPractice) return;
    while (this.playerManager.getXp() >= this.playerManager.getXpToNext()) {
      this.playerManager.incrementXp(-this.playerManager.getXpToNext());
      this.playerManager.incrementLevel();
      const newXpToNext = 5 + Math.floor(this.playerManager.getLevel() * 5);
      this.playerManager.setStats({ xpToNext: newXpToNext });
      this.triggerLevelUp();
    }
  }

  private async triggerLevelUp(): Promise<void> {
    this.inLevelUp = true;
    if (this.attackEvt) this.attackEvt.paused = true;
    if (this.spawnEvt) this.spawnEvt.paused = true;
    if (this.runTimerEvt) this.runTimerEvt.paused = true;
    this.physics.world.isPaused = true;
    // Present 3 upgrades
    const pool = [
      '+20% Fire Rate',
      '+1 Projectile',
      '+10% Move Speed',
    ];
    if (this.playerManager.getHasMagnet()) pool.push('+25% Magnet Radius');
    if (this.playerManager.getHasBlast()) pool.push('+20% Blast Radius');
    const picks = Phaser.Utils.Array.Shuffle(pool).slice(0, 3);
    try {
      const choice = await openLevelUp(picks);
      const selected = picks[choice];
      if (selected.includes('Fire Rate')) {
        this.playerManager.upgradeFireRate();
        this.scheduleAttack();
      } else if (selected.includes('Projectile')) {
        this.playerManager.upgradeProjectile();
      } else if (selected.includes('Move Speed')) {
        this.playerManager.upgradeSpeed();
      } else if (selected.includes('Magnet')) {
        this.playerManager.upgradeMagnet();
      } else if (selected.includes('Blast')) {
        this.playerManager.upgradeBlast();
      }
    } catch (error) {
      Logger.error('Failed to trigger level up', error as Error);
    } finally {
      this.playerManager.restoreFullHealth();
      this.lastDamageAt = this.time.now;
      this.regenAccumulator = 0;
      this.inLevelUp = false;
      if (this.attackEvt) this.attackEvt.paused = false;
      if (this.spawnEvt) this.spawnEvt.paused = false;
      if (this.runTimerEvt) this.runTimerEvt.paused = false;
      this.physics.world.isPaused = false;
      this.updateHUD();
      this.updateBuildHUD();
    }
  }

  private setSpawnDelay(ms: number): void {
    this.currentSpawnDelay = ms;
    if (this.spawnEvt) this.spawnEvt.remove(false);
    this.spawnEvt = this.time.addEvent({ delay: ms, loop: true, callback: () => this.spawnEnemy() });
  }

  private tickPerf(dtMs: number): void {
    this.perfAccum += dtMs;
    this.perfFrames += 1;
    if (this.perfAccum >= 2000) {
      const fps = (this.perfFrames / this.perfAccum) * 1000;
      const wasLow = this.lowSpec;
      if (fps < 45) this.lowSpec = true;
      else if (fps > 55) this.lowSpec = false;
      if (wasLow !== this.lowSpec) {
        // Adjust spawn pacing on low-spec
        const target = this.lowSpec ? this.currentSpawnDelay + 600 : Math.max(this.baseSpawnDelay, this.currentSpawnDelay - 600);
        this.setSpawnDelay(target);
        this.uiManager.showHint(this.lowSpec ? '저사양 모드: 스폰 완화' : '성능 회복: 스폰 정상');
      }
      this.perfAccum = 0;
      this.perfFrames = 0;
    }
  }

  update(_: number, _dtMs: number): void {
    if (this.inLevelUp) {
      this.player.setVelocity(0, 0);
      return;
    }
    if (this.runOver) {
      this.player.setVelocity(0, 0);
      return;
    }
    this.tickPerf(_dtMs);

    // Update player
    this.playerManager.update(this.player.x, this.player.y, this.cursors);

    // Update enemies
    this.enemyManager.updateEnemies(this.player.x, this.player.y, this.time.now);

    // Boss logic
    this.maybeSpawnBoss();
    if (this.bossActive) this.updateBoss();

    // Magnet logic
    if (this.playerManager.getHasMagnet()) {
      this.handleMagnet();
    }

    this.handleRegen(_dtMs);
  }

  private handleRegen(dtMs: number): void {
    if (this.runOver || this.inLevelUp) return;
    if (this.playerManager.getHp() >= this.playerManager.getMaxHp()) {
      this.regenAccumulator = 0;
      return;
    }
    const now = this.time.now;
    if (now - this.lastDamageAt < this.regenDelayMs) {
      this.regenAccumulator = 0;
      return;
    }
    this.regenAccumulator += dtMs;
    if (this.regenAccumulator >= this.regenIntervalMs) {
      this.playerManager.heal(1);
      this.regenAccumulator = 0;
      this.updateHUD();
    }
  }

  private handleMagnet(): void {
    const orbs = this.xpOrbs.getChildren() as Phaser.Types.Physics.Arcade.ImageWithDynamicBody[];
    for (const o of orbs) {
      if (!o.active) continue;
      const dx = this.player.x - o.x;
      const dy = this.player.y - o.y;
      const dist = Math.hypot(dx, dy);
      if (dist < this.playerManager.getMagnetRadius()) {
        this.physics.velocityFromRotation(Math.atan2(dy, dx), 120, o.body.velocity);
      } else {
        o.setVelocity(0, 0);
      }
    }
  }

  private maybeSpawnBoss(): void {
    // Implementation would go here
  }

  private updateBoss(): void {
    // Implementation would go here
  }

  private applyRewards(): void {
    const rewards = loadRewards();
    if (rewards.includes('magnet')) {
      this.playerManager.setStats({ hasMagnet: true, magnetRadius: 100 });
    }
    if (rewards.includes('blast')) {
      this.playerManager.setStats({ hasBlast: true });
      this.time.addEvent({ delay: 5000, loop: true, callback: () => this.radialBlast() });
    }
  }

  private radialBlast(): void {
    this.combatManager.radialBlast(
      this.player.x,
      this.player.y,
      this.enemies,
      this.playerManager.getAttackRadius(),
      this.playSfx.bind(this)
    );
  }

  private applyRunStateIfAny(): void {
    if (this.isPractice) { clearRunState(); return; }
    const rs = loadRunState();
    if (!rs) return;
    this.playerManager.setStats({
      level: rs.level,
      xp: rs.xp,
      xpToNext: rs.xpToNext,
      speed: rs.speed,
      attackCooldown: rs.attackCooldown,
      projSpeed: rs.projSpeed,
      projCount: rs.projCount,
      projectileDamage: rs.projectileDamage,
      pierceTargets: rs.pierceTargets,
      hasMagnet: rs.hasMagnet,
      magnetRadius: rs.magnetRadius,
      hasBlast: rs.hasBlast,
      attackRadius: rs.attackRadius,
      hp: rs.hp,
      maxHp: rs.maxHp,
      fireRateLv: rs.fireRateLv,
      projLv: rs.projLv,
      projSpeedLv: rs.projSpeedLv,
      damageLv: rs.damageLv,
      pierceLv: rs.pierceLv,
      speedLv: rs.speedLv,
      magnetLv: rs.magnetLv,
      blastLv: rs.blastLv,
      staticFieldLv: rs.staticFieldLv,
      staticFieldCooldown: rs.staticFieldCooldown,
      staticFieldRadius: rs.staticFieldRadius,
      staticFieldDamage: rs.staticFieldDamage,
      droneLevel: rs.droneLevel,
      droneDamage: rs.droneDamage,
    } as any);
    this.lastDamageAt = this.time.now;
    this.regenAccumulator = 0;
    this.scheduleAttack();
    clearRunState();
  }

  private exportRunState(): void {
    const stats = this.playerManager.getStats();
    const rs: RunBuild = {
      level: stats.level,
      xp: stats.xp,
      xpToNext: stats.xpToNext,
      speed: stats.speed,
      attackCooldown: stats.attackCooldown,
      projSpeed: stats.projSpeed,
      projCount: stats.projCount,
      projectileDamage: (stats as any).projectileDamage ?? 1,
      pierceTargets: (stats as any).pierceTargets ?? 0,
      hasMagnet: stats.hasMagnet,
      magnetRadius: stats.magnetRadius,
      hasBlast: stats.hasBlast,
      attackRadius: stats.attackRadius,
      hp: stats.hp,
      maxHp: stats.maxHp,
      fireRateLv: stats.fireRateLv,
      projLv: stats.projLv,
      projSpeedLv: (stats as any).projSpeedLv ?? 0,
      damageLv: (stats as any).damageLv ?? 0,
      pierceLv: (stats as any).pierceLv ?? ((stats as any).pierceTargets ?? 0),
      speedLv: stats.speedLv,
      magnetLv: stats.magnetLv,
      blastLv: stats.blastLv,
      staticFieldLv: (stats as any).staticFieldLv ?? 0,
      staticFieldCooldown: (stats as any).staticFieldCooldown ?? 4500,
      staticFieldRadius: (stats as any).staticFieldRadius ?? 120,
      staticFieldDamage: (stats as any).staticFieldDamage ?? 1,
      droneLevel: (stats as any).droneLevel ?? 0,
      droneDamage: (stats as any).droneDamage ?? 1,
    };
    saveRunState(rs);
  }

  private clearEnemies(): void {
    const list = this.enemies.getChildren() as Enemy[];
    for (const e of list) (e as Enemy).disableBody(true, true);
  }

  private spawnPracticePack(n: number): void {
    for (let i = 0; i < n; i++) this.spawnEnemy();
  }

  private endRun(reason: 'time' | 'defeat'): void {
    if (this.runOver) return;
    if (this.isPractice) return // never end in practice
    this.runOver = true;
    if (this.spawnEvt) this.spawnEvt.paused = true;
    if (this.attackEvt) this.attackEvt.paused = true;
    if (this.runTimerEvt) this.runTimerEvt.paused = true;
    this.physics.world.isPaused = true;
    if (reason === 'time') {
      this.playerManager.restoreFullHealth();
      this.lastDamageAt = this.time.now;
      this.regenAccumulator = 0;
      this.updateHUD();
      this.exportRunState();
    }
    const survived = 90 - Math.max(0, 90); // This would need to be properly calculated
    const detail = { reason, stage: this.stage, survived, level: this.playerManager.getLevel(), kills: this.kills };
    window.dispatchEvent(new CustomEvent('runover:open', { detail }));
  }

  private playSfx(freq: number): void {
    const ctx = (this.sound as any).context as AudioContext | undefined;
    if (!ctx) return;
    
    // Map frequencies to specific sound types for better theming
    if (freq === 660) {
      // XP collection sound - empowerment
      this.playEmpowermentSound();
    } else if (freq === 880) {
      // Click/menu sound
      this.playMenuSound();
    } else if (freq === 440) {
      // Attack sound - empowerment projectile
      this.playAttackSound();
    } else if (freq === 520) {
      // Blast sound
      this.playBlastSound();
    } else if (freq === 330) {
      // Enemy hit sound
      this.playEnemyHitSound();
    } else if (freq === 180 || freq === 120) {
      // Barrier/damage sound
      this.playBarrierSound();
    } else {
      // Fallback to original sound generation
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  }

  private playEmpowermentSound(): void {
    const ctx = (this.sound as any).context as AudioContext | undefined;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Create an ascending, harmonious sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    oscillator.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3); // G5
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
  }

  private playBarrierSound(): void {
    const ctx = (this.sound as any).context as AudioContext | undefined;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Create a dissonant, descending sound
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(220, ctx.currentTime); // A3
    oscillator.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2); // A2
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
  }

  private playAttackSound(): void {
    const ctx = (this.sound as any).context as AudioContext | undefined;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Create a sharp, focused sound
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
    oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
    
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.1);
  }

  private playEnemyHitSound(): void {
    const ctx = (this.sound as any).context as AudioContext | undefined;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Create a short, percussive sound
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(330, ctx.currentTime); // E4
    oscillator.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15); // A3
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.15);
  }

  private playBlastSound(): void {
    const ctx = (this.sound as any).context as AudioContext | undefined;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Create a powerful, resonant sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(110, ctx.currentTime); // A2
    oscillator.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.4); // A1
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
  }

  private playMenuSound(): void {
    const ctx = (this.sound as any).context as AudioContext | undefined;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Create a clean, digital sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.05);
  }

  private openPause(): void {
    if (this.inLevelUp || this.runOver) return;
    this.physics.world.isPaused = true;
    if (this.spawnEvt) this.spawnEvt.paused = true;
    if (this.attackEvt) this.attackEvt.paused = true;
    if (this.runTimerEvt) this.runTimerEvt.paused = true;
    window.dispatchEvent(new CustomEvent('pause:open'));
    const onResume = () => {
      window.removeEventListener('pause:resume', onResume);
      this.physics.world.isPaused = false;
      if (this.spawnEvt) this.spawnEvt.paused = false;
      if (this.attackEvt) this.attackEvt.paused = false;
      if (this.runTimerEvt) this.runTimerEvt.paused = false;
    };
    window.addEventListener('pause:resume', onResume);
  }

  private updateHUD(): void {
    const stats = this.playerManager.getStats();
    const uiState: UIState = {
      runSecLeft: this.runSecLeft,
      runSecInit: this.runSecInit,
      stage: this.stage,
      hp: stats.hp,
      maxHp: stats.maxHp,
      level: stats.level,
      xp: stats.xp,
      xpToNext: stats.xpToNext,
      kills: this.kills,
      isPractice: this.isPractice,
      speed: stats.speed,
      projSpeed: stats.projSpeed,
      attackCooldown: stats.attackCooldown,
      projCount: stats.projCount,
      hasMagnet: stats.hasMagnet,
      magnetRadius: stats.magnetRadius,
      magnetLv: stats.magnetLv,
      hasBlast: stats.hasBlast,
      attackRadius: stats.attackRadius,
      blastLv: stats.blastLv,
    };
    this.uiManager.updateHUD(uiState);
  }

  private updateBuildHUD(): void {
    const stats = this.playerManager.getStats();
    const uiState: UIState = {
      runSecLeft: this.runSecLeft,
      runSecInit: this.runSecInit,
      stage: this.stage,
      hp: stats.hp,
      level: stats.level,
      xp: stats.xp,
      xpToNext: stats.xpToNext,
      kills: this.kills,
      isPractice: this.isPractice,
      speed: stats.speed,
      projSpeed: stats.projSpeed,
      attackCooldown: stats.attackCooldown,
      projCount: stats.projCount,
      hasMagnet: stats.hasMagnet,
      magnetRadius: stats.magnetRadius,
      magnetLv: stats.magnetLv,
      hasBlast: stats.hasBlast,
      attackRadius: stats.attackRadius,
      blastLv: stats.blastLv,
      maxHp: stats.maxHp,
    };
    this.uiManager.updateBuildHUD(uiState);
  }

  private startRealRunNow(): void {
    if (!this.isPractice) return;
    this.isPractice = false;
    // Hide practice UI
    window.dispatchEvent(new CustomEvent('ui:practiceMode', { detail: { enabled: false } }));
    // Unpause everything
    this.physics.world.isPaused = false;
    if (this.spawnEvt) this.spawnEvt.paused = false;
    if (this.attackEvt) this.attackEvt.paused = false;
    // Start run timer if not created yet
    if (!this.runTimerEvt) {
      this.runTimerEvt = this.time.addEvent({
        delay: 1000, loop: true, callback: () => {
          if (this.runOver) return;
          this.runSecLeft -= 1;
          if (this.runSecLeft <= 0) this.endRun('time');
          this.updateHUD();
        }
      });
    }
    // Reset timer to full for a fresh run
    this.runSecLeft = this.runSecInit;
    // Re-apply any stage rewards if needed
    const rewards = loadRewards();
    const stats = this.playerManager.getStats();
    if (rewards.includes('magnet') && !stats.hasMagnet) {
      this.playerManager.setStats({ hasMagnet: true, magnetRadius: 100 });
    }
    if (rewards.includes('blast') && !stats.hasBlast) {
      this.playerManager.setStats({ hasBlast: true });
      this.time.addEvent({ delay: 5000, loop: true, callback: () => this.radialBlast() });
    }
    this.playerManager.restoreFullHealth();
    this.lastDamageAt = this.time.now;
    this.regenAccumulator = 0;
    // Clean field to avoid leftover practice clutter
    this.clearEnemies();
    for (let i = 0; i < 6; i++) this.spawnEnemy();
    this.uiManager.showHint('Run started! Survive the timer.');
    this.updateHUD();
    this.updateBuildHUD();
  }

  // Additional methods that would need to be implemented
  private onHitEnemy(_e: Enemy): void {
    const now = this.time.now;
    if (now < this.playerManager.getInvulnUntil() || this.runOver || this.inLevelUp) return;
    if (this.isPractice) return;
    this.playerManager.setInvulnUntil(now + 700);
    this.playerManager.decrementHp(this.combatManager.getDamageToPlayer());
    this.lastDamageAt = now;
    this.regenAccumulator = 0;
    this.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, duration: 80, repeat: 2 });
    this.playSfx(180);
    if ((window as any)._settings?.screenShake) this.cameras.main.shake(100, 0.004);
    if (this.playerManager.getHp() <= 0) this.endRun('defeat');
    this.updateHUD();
  }

  private onBulletHitPlayer(): void {
    const now = this.time.now;
    if (now < this.playerManager.getInvulnUntil() || this.runOver || this.inLevelUp) return;
    if (this.isPractice) return;
    this.playerManager.setInvulnUntil(now + 700);
    this.playerManager.decrementHp(this.combatManager.getDamageToPlayer());
    this.lastDamageAt = now;
    this.regenAccumulator = 0;
    this.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, duration: 80, repeat: 2 });
    this.playSfx(120);
    if ((window as any)._settings?.screenShake) this.cameras.main.shake(120, 0.005);
    if (this.playerManager.getHp() <= 0) this.endRun('defeat');
    this.updateHUD();
  }
}