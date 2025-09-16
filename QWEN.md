# Limitless Survivor Project Context

## Project Overview

Limitless Survivor is an accessible web-based Vampire Survivors-like game built with Phaser 3, TypeScript, and Vite. The game is designed with accessibility in mind, featuring multiple input methods including mouse, voice commands, one-switch scanning, and experimental face gesture controls.

### Key Features
- Click-to-Move and Pointer-Follow movement systems
- Auto-attack mechanics with enemy combat and XP collection
- Short gameplay runs (1.5-3 minutes) ending in victory (time-up) or defeat
- Meta progression system with token rewards and stage unlocks
- Multiple accessibility features:
  - Voice controls (Web Speech API) with Korean/English keywords
  - One-switch scan mode for UI navigation
  - Face gesture controls (beta) for head tilt movement
  - High-contrast themes and text scaling options
- Progressive Web App (PWA) support for offline play
- No backend dependencies - all progress stored in localStorage

### Technology Stack
- **Game Engine**: Phaser 3
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI**: HTML/CSS with DOM overlays
- **Additional Libraries**: 
  - MediaPipe Tasks for face gesture recognition
  - Vite PWA plugin for offline support

## Project Structure

```
/game
├── src/
│   ├── main.ts              # Entry point
│   ├── style.css            # Global styles
│   ├── vite-env.d.ts        # TypeScript declarations
│   ├── game/
│   │   ├── config.ts        # Phaser configuration
│   │   └── scenes/
│   │       ├── Boot.ts      # Initial loading scene
│   │       ├── Menu.ts      # Main menu scene
│   │       └── GameScene.ts # Main gameplay scene
│   ├── state/
│   │   ├── settings.ts      # User settings management
│   │   ├── progress.ts      # Stage progress tracking
│   │   ├── run.ts           # Run state persistence
│   │   └── rewards.ts       # Reward system
│   ├── input/
│   │   ├── VirtualInput.ts  # Movement input handling
│   │   ├── speech.ts        # Voice command system
│   │   └── face.ts          # Face gesture controls
│   └── ui/
│       ├── overlays.ts      # UI overlay management
│       └── scan.ts          # One-switch scanning
├── public/
│   ├── assets/              # Game assets (images, fonts)
│   └── vite.svg             # Favicon
├── index.html               # Main HTML file
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Vite build configuration
```

## Development Workflow

### Prerequisites
- Node.js (version not specified, but modern LTS recommended)
- npm package manager

### Setup
```bash
cd game
npm install
```

### Development
```bash
npm run dev
```
Starts the Vite development server with hot module replacement (HMR). The game will be available at the local URL shown in the terminal.

### Building
```bash
npm run build
```
Compiles TypeScript code and bundles the application for production. Output is placed in the `dist/` directory.

### Preview Production Build
```bash
npm run preview
```
Serves the production build locally for testing.

### Deployment
#### GitHub Pages
```bash
npm run deploy:gh
```
Deploys the built application to GitHub Pages using the `dist/` directory.

#### Other Platforms (Cloudflare Pages, Netlify)
- Build command: `npm run build`
- Output directory: `dist`

## Game Architecture

### Core Components

1. **Scenes**:
   - `Boot`: Initial loading and asset preparation
   - `Menu`: Main menu interface
   - `GameScene`: Primary gameplay logic

2. **State Management**:
   - Settings: User preferences (movement mode, accessibility options)
   - Progress: Stage unlocks and meta progression
   - Run state: Current game session stats (level, XP, etc.)
   - Rewards: Permanent upgrades earned through gameplay

3. **Input Systems**:
   - VirtualInput: Core movement abstraction supporting click-to-move and pointer-follow
   - Speech: Voice command processing
   - Face: Experimental face gesture recognition
   - Keyboard: Traditional keyboard controls for development

4. **UI Components**:
   - Settings overlay
   - Level-up selection
   - Run completion screen
   - Pause menu
   - One-switch scanning interface

### Game Mechanics

- **Combat**: Auto-attack system with projectile-based damage
- **Progression**: Level up by collecting XP orbs, choose from 3 upgrade options
- **Enemies**: Multiple enemy types with distinct behaviors
- **Rewards**: Token-based meta progression system
- **Difficulty**: Three levels (Relaxed, Standard, Intense) affecting enemy stats

## Accessibility Features

1. **Movement Options**:
   - Click-to-Move: Single click to move to a location
   - Pointer-Follow: Continuous movement toward cursor position

2. **Alternative Inputs**:
   - Voice Commands: Korean/English keywords for movement and actions
   - One-Switch Scanning: Automatic focus cycling with Space/Enter activation
   - Face Gestures: Head tilt detection for movement nudges

3. **Visual Accommodations**:
   - High-contrast themes
   - Adjustable text sizing
   - Multiple color palettes (default, high-visibility, grayscale)
   - Projectile visibility options

4. **Motor Support**:
   - Dwell activation (hover-to-click)
   - Customizable timing for scanning and dwell features

## Coding Standards

### TypeScript Configuration
- Strict type checking enabled
- Modern ES2022 target
- ES modules only
- No unused variables or parameters

### File Naming
- Scenes and classes: PascalCase (e.g., `GameScene.ts`)
- Utilities: lowerCamelCase (e.g., `overlays.ts`)
- Assets: lowercase_with_underscores (e.g., `enemy_turn.png`)

### Code Style
- 2-space indentation
- Prefer `const` over `let`
- Avoid `any` type when possible
- Narrow types where possible

## Testing

Currently, no automated tests are configured. Manual validation is recommended for:
- Game loading and basic functionality
- Run start and completion flows
- Level-up overlay functionality
- Settings toggles
- PWA offline capabilities
- Speech and face input systems

For new logic additions, small unit tests using Vitest are recommended in `*.test.ts` files alongside source files.

## Storage and Persistence

All game progress is stored in localStorage:
- `limitless:settings:v1`: User settings and preferences
- `limitless:progress:v1`: Stage unlocks and meta progression
- `limitless:run:v1`: Temporary run state persistence
- `limitless:rewards:v1`: Permanent reward unlocks

No server-side storage or authentication is implemented.

## Deployment Considerations

- Static hosting only - no backend dependencies
- PWA configured with `navigateFallback: 'index.html'`
- Build uses `--base=./` for subpath hosting compatibility (GitHub Pages)
- Never commit `node_modules` or large binaries
- Commit `package-lock.json` for dependency consistency