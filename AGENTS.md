# Repository Guidelines

## Project Structure & Module Organization
- App in `game/` (Vite + TypeScript + Phaser 3).
- Source: `game/src/`
  - `game/src/game/scenes/*` gameplay scenes (Boot, Menu, GameScene).
  - `game/src/state/*` run/settings/progress state.
  - `game/src/input/*` input adapters (virtual, speech, face).
  - `game/src/ui/*` DOM overlays and scan UI.
- Assets: `game/public/assets/*` (PNG, JSON, fonts). Build output: `game/dist/`.

## Build, Test, and Development Commands
- `cd game && npm install` install dependencies.
- `npm run dev` start Vite dev server with HMR.
- `npm run build` type‑checks then bundles to `dist/` (`--base=./` for GitHub Pages).
- `npm run preview` serve the production build locally.
- `npm run deploy:gh` publish `dist/` to `gh-pages`.

## Coding Style & Naming Conventions
- TypeScript strict; prefer `const`, avoid `any`, narrow types.
- Indentation: 2 spaces; ES modules only.
- Scenes/classes: PascalCase file and class names (e.g., `GameScene.ts`).
- Utilities not tied to a class: lowerCamel file names (e.g., `overlays.ts`).
- Assets: lowercase_with_underscores (e.g., `enemy_turn.png`). Align to 16×16 grid; avoid sub‑pixel transforms.

## Testing Guidelines
- No automated tests configured. Validate manually: load app, start a run, level‑up overlay, settings toggles, PWA offline, and speech/face inputs.
- Adding logic? Include small unit tests (Vitest recommended). Name files `*.test.ts` next to sources.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `chore:`, etc. Example: `feat: add projectile combat`.
- Keep PRs focused; include description, linked issues, reproduction/test steps, and screenshots or a short clip.
- Do not commit `node_modules` or large binaries; commit `package-lock.json`.

## Security & Configuration Tips
- Static frontend only—never add secrets or server code. Progress persists in `localStorage` keys like `limitless:progress:v1`.
- PWA uses `navigateFallback: 'index.html'`; keep `vite build --base=./` for subpath hosting (GitHub Pages).
