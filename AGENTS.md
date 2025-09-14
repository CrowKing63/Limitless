Limitless Survivor — Agent Quick Guide (concise)

What
- Top‑down survivor focused on accessibility and crisp 16×16 pixel art.
- Phaser 3 + Vite + TypeScript; internal res 320×180 with integer zoom.

Run
- Dev: `cd game && npm run dev`
- Preview: `npm run build && npm run preview`

Assets (drop‑in)
- Put PNGs in `game/public/assets/`.
- Known keys: `player.png`, `enemy.png`, `enemy_curb.png`, `enemy_turn.png`, `enemy_elev.png`, `enemy_barrier.png`, `enemy_sign.png`, `tiles.png`, `fx_explosion.png`, `boss.png`.
- Tiled map: `public/assets/level1.json` (tileset name `tiles`, 16×16).

Pixel rules
- Keep art 16×16 (or 32×32 at 2×). Avoid sub‑pixel transforms.
- Engine: `pixelArt: true`, `roundPixels: true`; CSS `image-rendering: pixelated`.

Settings (simplified)
- Default view shows only: Movement Mode, Difficulty, High‑contrast theme, Text size.
- Click “Show Advanced” to reveal: Scan/Dwell/Face; Telegraph duration/contrast; Screen shake; Palette (Default/High/Mono); High‑visibility projectiles.

Gameplay
- Enemies: stairs/curb/turn/elev/barrier/sign. HP scales by stage.
- Boss: large (48×48) with 3 patterns (ring burst, aimed fan, zigzag dash) + HP bar.
- Difficulty scales enemy speed/HP, projectile speed, telegraph length, and player damage.
- FX: hit pop; optional `fx_explosion.png`; telegraphs respect settings.

Recent changes (summary)
- Pixel‑art pipeline + integer zoom at 320×180.
- Directional player anims, 16×16 tile background, FX.
- New enemies + accessible symbols; boss system with 3 patterns.
- Difficulty + damage scaling; palette/hi‑visibility + screen shake options.
- Settings panel simplified with Advanced toggle (collapsed by default).

Touched files
- `game/src/game/config.ts`, `game/src/style.css`, `game/src/main.ts`.
- `game/src/game/scenes/Boot.ts`, `game/src/game/scenes/GameScene.ts`, `game/src/game/scenes/Menu.ts`.
- `game/index.html`, `game/public/assets/level1.json`, `game/public/assets/fonts/*`.

Contrib
- Swap art by keeping texture keys; prefer CC0 assets.
- Keep code minimal and grid‑aligned; no sub‑pixel movement.
