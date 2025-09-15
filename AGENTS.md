# Repository Guidelines

## Project Structure & Module Organization
- App lives in `game/` (Vite + TypeScript + Phaser 3).
- Source: `game/src/`
  - `game/src/game/scenes/*` scenes (Boot, Menu, GameScene).
  - `game/src/state/*` run/settings/progress state.
  - `game/src/input/*` input adapters (virtual, speech, face).
  - `game/src/ui/*` DOM/ARIA overlays and scan UI.
- Assets: `game/public/assets/*` (PNG, JSON, fonts). Build output: `game/dist/`.

## Build, Test, and Development Commands
- `cd game && npm install` install deps.
- `npm run dev` start Vite dev server.
- `npm run build` type‑check then bundle to `dist/` (`--base=./` for Pages).
- `npm run preview` serve the production build locally.
- `npm run deploy:gh` publish `dist/` to `gh-pages`.

## Coding Style & Naming Conventions
- TypeScript strict; prefer `const`, no `any`, narrow types.
- Indentation: 2 spaces; ES modules only.
- Scenes and classes: PascalCase file and class names (e.g., `GameScene.ts`).
- Modules/utilities: lowerCamel file names when not tied to a class (e.g., `overlays.ts`).
- Assets: lowercase with underscores (e.g., `enemy_turn.png`). Keep 16×16 pixel grid; avoid sub‑pixel transforms.

## Testing Guidelines
- No automated tests are configured yet. Validate manually: load, start a run, level‑up overlay, settings toggles, PWA offline, and speech/face inputs.
- If adding logic, include lightweight unit tests (suggested: Vitest). Name as `*.test.ts` next to sources.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat: ...`, `fix: ...`, `chore: ...` (present‑tense, concise). Example: `feat: add projectile combat`.
- Keep PRs focused; include description, linked issues, test steps, and before/after screenshots or a short screen capture.
- Do not commit large binaries or `node_modules`. Commit `package-lock.json`.

## Security & Configuration Tips
- This is a static app; do not add secrets or server code. Progress persists in `localStorage` (`limitless:progress:v1`).
- PWA uses `navigateFallback: 'index.html'`; keep `build --base=./` for subpath hosting (GitHub Pages).
