# Limitless Survivor (Accessible Web Game)

Accessible Vampire Survivors–like built with Phaser 3 + TypeScript + Vite.

## Features
- Click‑to‑Move and Pointer‑Follow movement.
- Auto‑attack pulse; enemies, XP orbs, level‑ups with 3 upgrade choices.
- Short runs (about 1.5–3 minutes). A run ends on defeat or time‑up.
- Run Complete screen awards Tokens (meta rewards, distinct from level‑ups).
- Stage progression (no backend): spend Tokens to unlock the next stage.
- Voice controls (Web Speech API) with Korean/English keywords.
- One‑switch scan mode for overlay navigation (Space/Enter to confirm).
- Optional face gestures (beta): head tilt nudges movement.
- Custom accessibility-themed assets representing disability rights and inclusion.
- Thematic sound design that reinforces empowerment rather than violence.
- PWA (offline‑capable); ready for static hosting.

## Run
```bash
npm install
npm run dev
```
Open the local URL, click “Play”.

## Controls
- Mouse: single click to move (default) or enable Pointer‑Follow in Settings.
- Voice PTT: press the mic button, then say
  - Move: “위/아래/왼쪽/오른쪽” or “up/down/left/right”
  - Stop: “정지” or “stop”
  - Level‑Up selection: “하나/둘/셋” or “one/two/three”
- One‑switch scan: enable in Settings; overlay buttons auto‑scan; press Space/Enter to pick.
- Face gestures (beta): enable in Settings, grant camera; tilting your head nudges movement repeatedly.

## Build
```bash
npm run build
npm run preview
```

## Deploy
### GitHub Pages (from this folder)
1. `npm i -D gh-pages` (already added)
2. `npm run deploy:gh` (uses `dist/` and publishes to `gh-pages` branch). Ensure you’ve set up a remote and have push rights.
   - In repo settings → Pages, select `gh-pages` branch `/ (root)`.
   - This build uses `--base=./` to work under subpaths.

### Cloudflare Pages / Netlify
- Build command: `npm run build`
- Output folder: `dist`

## Notes
- Speech support varies by browser; on iOS you may need to re‑enable mic after backgrounding.
- Face gestures use MediaPipe Tasks over WASM and may be CPU‑intensive on low‑end devices; toggle off if performance dips.
- Menus are DOM/ARIA so OS dwell/head pointer/voice control interoperate well.

## Meta Progression (No Backend)
- Tokens are awarded at run end: based on kills and level, with a bonus for surviving to time‑up. Tokens are distinct from in‑run level‑up upgrades.
- Stages scale enemy speed and spawn rate. Unlock cost for the next stage increases gradually (≈3 + 2×(currentStage−1) tokens).
- Progress persists via `localStorage` under `limitless:progress:v1`.
- Reset progress: open DevTools Console and run `localStorage.removeItem('limitless:progress:v1')`.

## Accessibility Tips
- Enable One‑switch Scan in Settings to cycle focus across overlay buttons (Start/Settings/Level‑Up/Run Complete). Space/Enter activates the highlighted control.
- Increase "Text size" and enable "High‑contrast" as needed.
- All game assets have been designed with accessibility in mind, using high contrast colors and clear visual representations of accessibility concepts.

