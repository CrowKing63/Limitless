import './style.css'
import Phaser from 'phaser'
import { phaserConfig, GAME_WIDTH, GAME_HEIGHT } from './game/config'
import { applySettingsToDocument, emitSettingsChanged, loadSettings, saveSettings, type SettingsState } from './state/settings'
import { loadProgress, saveProgress } from './state/progress'
import { clearRunState } from './state/run'
import { addReward } from './state/rewards'
import { initSpeech } from './input/speech'
import { initFaceInput, start as startFace, stop as stopFace } from './input/face'
import { startScan } from './ui/scan'

// Initialize settings UI
const settings = loadSettings()
applySettingsToDocument(settings)
;(window as any)._settings = settings

const settingsOverlay = document.getElementById('settings-overlay')!
const btnSettings = document.getElementById('btn-settings') as HTMLButtonElement | null
const btnCloseSettings = document.getElementById('btn-close-settings') as HTMLButtonElement
const btnAdv = document.getElementById('btn-adv') as HTMLButtonElement | null
const btnPTT = document.getElementById('btn-ptt') as HTMLButtonElement | null
const chkContrast = document.getElementById('chk-contrast') as HTMLInputElement
const rngText = document.getElementById('rng-text') as HTMLInputElement
const chkScan = document.getElementById('chk-scan') as HTMLInputElement
const chkFace = document.getElementById('chk-face') as HTMLInputElement
const chkShake = document.getElementById('chk-shake') as HTMLInputElement
const rngTele = document.getElementById('rng-tele') as HTMLInputElement
const chkTeleBold = document.getElementById('chk-telebold') as HTMLInputElement
const selPalette = document.getElementById('sel-palette') as HTMLSelectElement
const chkBulletBold = document.getElementById('chk-bulletbold') as HTMLInputElement
const rngGain = document.getElementById('rng-gain') as HTMLInputElement
const rngMaxDist = document.getElementById('rng-maxdist') as HTMLInputElement
const rngCurve = document.getElementById('rng-curve') as HTMLInputElement
const faceIndicator = document.getElementById('face-indicator') as HTMLSpanElement | null
const rngArrive = document.getElementById('rng-arrive') as HTMLInputElement
const rngDeadzone = document.getElementById('rng-deadzone') as HTMLInputElement
const rngScan = document.getElementById('rng-scan') as HTMLInputElement
const chkDwell = document.getElementById('chk-dwell') as HTMLInputElement
const rngDwell = document.getElementById('rng-dwell') as HTMLInputElement
const rngTilt = document.getElementById('rng-tilt') as HTMLInputElement
const rngNudge = document.getElementById('rng-nudge') as HTMLInputElement
const rngRepeat = document.getElementById('rng-repeat') as HTMLInputElement
const diffRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="difficulty"]'))
// removed tutorial overlay
// Run Complete overlay elements
const runoverOverlay = document.getElementById('runover-overlay') as HTMLElement
const runoverSummary = document.getElementById('runover-summary') as HTMLElement
// Removed: token reward display
const stageRewards = document.getElementById('stage-rewards') as HTMLElement
const btnRewardMagnet = document.getElementById('reward-magnet') as HTMLButtonElement
const btnRewardBlast = document.getElementById('reward-blast') as HTMLButtonElement
const btnNextStage = document.getElementById('btn-next-stage') as HTMLButtonElement
const btnRetry = document.getElementById('btn-retry') as HTMLButtonElement
const btnMenu = document.getElementById('btn-menu') as HTMLButtonElement
// Pause overlay elements
const pauseOverlay = document.getElementById('pause-overlay') as HTMLElement
const btnResume = document.getElementById('btn-resume') as HTMLButtonElement
const btnQuit = document.getElementById('btn-quit') as HTMLButtonElement
// Practice sidebar Start Run button
const btnStartRun = document.getElementById('btn-start-run') as HTMLButtonElement | null

// Movement mode radios
const radios = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="moveMode"]'))
radios.forEach(r => (r.checked = r.value === settings.movementMode))
chkContrast.checked = settings.highContrast
rngText.value = String(settings.textScale)
chkScan.checked = settings.scanMode
chkFace.checked = false
chkDwell.checked = settings.dwellEnabled
rngDwell.value = String(settings.dwellTime)
rngScan.value = String(settings.scanInterval)
rngArrive.value = String(settings.clickArriveRadius)
rngDeadzone.value = String(settings.followDeadzone)
rngGain.value = String(Math.round(settings.followGain * 100))
rngMaxDist.value = String(settings.followMaxDist)
rngCurve.value = String(Math.round(settings.followCurve * 100))
rngTilt.value = String(Math.round(settings.faceTiltSensitivity * 1000))
rngNudge.value = String(settings.faceNudgeDistance)
rngRepeat.value = String(settings.faceRepeatMs)
if (rngTele) rngTele.value = String(settings.telegraphMs)
if (chkTeleBold) chkTeleBold.checked = settings.telegraphBold
if (selPalette) selPalette.value = settings.palette
if (chkBulletBold) chkBulletBold.checked = settings.projectileBold
if (chkShake) chkShake.checked = settings.screenShake
diffRadios.forEach(r => (r.checked = r.value === settings.difficulty))

function updateSettings(partial: Partial<SettingsState>) {
  const next = { ...settings, ...partial }
  saveSettings(next)
  applySettingsToDocument(next)
  emitSettingsChanged(next)
  Object.assign(settings, next)
  ;(window as any)._settings = next
}

btnSettings?.addEventListener('click', () => openSettings())
btnCloseSettings.addEventListener('click', () => closeSettings())
btnAdv?.addEventListener('click', () => {
  const card = document.getElementById('settings-overlay')!
  const on = !card.classList.contains('advanced')
  card.classList.toggle('advanced', on)
  if (btnAdv) { btnAdv.textContent = on ? 'Hide Advanced ▴' : 'Show Advanced ▾'; btnAdv.setAttribute('aria-pressed', on ? 'true' : 'false') }
})
if (btnPTT) initSpeech(btnPTT)
chkFace.addEventListener('change', async () => {
  if (chkFace.checked) {
    try {
      await startFace({ onMove: dir => window.dispatchEvent(new CustomEvent('voice:command', { detail: { type: 'move', dir } })) })
    } catch {
      chkFace.checked = false
      // Non-blocking user feedback; rely on browser permission UI
      console.warn('Face gestures unavailable (camera or model load failed).')
    }
  } else {
    stopFace()
  }
})
initFaceInput(chkFace, { onMove: () => {} })
chkContrast.addEventListener('change', () => updateSettings({ highContrast: chkContrast.checked }))
rngText.addEventListener('input', () => updateSettings({ textScale: Number(rngText.value) }))
chkScan.addEventListener('change', () => updateSettings({ scanMode: chkScan.checked }))
chkDwell.addEventListener('change', () => updateSettings({ dwellEnabled: chkDwell.checked }))
rngDwell.addEventListener('input', () => updateSettings({ dwellTime: Number(rngDwell.value) }))
rngScan.addEventListener('input', () => updateSettings({ scanInterval: Number(rngScan.value) }))
rngArrive.addEventListener('input', () => updateSettings({ clickArriveRadius: Number(rngArrive.value) }))
rngDeadzone.addEventListener('input', () => updateSettings({ followDeadzone: Number(rngDeadzone.value) }))
rngGain.addEventListener('input', () => updateSettings({ followGain: Number(rngGain.value) / 100 }))
rngMaxDist.addEventListener('input', () => updateSettings({ followMaxDist: Number(rngMaxDist.value) }))
rngCurve.addEventListener('input', () => updateSettings({ followCurve: Number(rngCurve.value) / 100 }))
rngTilt.addEventListener('input', () => updateSettings({ faceTiltSensitivity: Number(rngTilt.value) / 1000 }))
rngNudge.addEventListener('input', () => updateSettings({ faceNudgeDistance: Number(rngNudge.value) }))
rngRepeat.addEventListener('input', () => updateSettings({ faceRepeatMs: Number(rngRepeat.value) }))
rngTele?.addEventListener('input', () => updateSettings({ telegraphMs: Number(rngTele.value) }))
selPalette?.addEventListener('change', () => updateSettings({ palette: selPalette.value as any }))
chkBulletBold?.addEventListener('change', () => updateSettings({ projectileBold: chkBulletBold.checked }))
chkShake?.addEventListener('change', () => updateSettings({ screenShake: chkShake.checked }))
chkTeleBold?.addEventListener('change', () => updateSettings({ telegraphBold: chkTeleBold.checked }))
radios.forEach(r => r.addEventListener('change', () => updateSettings({ movementMode: (r.value as any) })))
diffRadios.forEach(r => r.addEventListener('change', () => updateSettings({ difficulty: (r.value as any) })))

let game: Phaser.Game | null = null
// Create game immediately (no initial popup)
game = new Phaser.Game(phaserConfig)
// Integer zoom manager (keeps crisp pixels at 1x,2x,3x ...)
function setIntZoom() {
  if (!game) return
  const z = Math.max(1, Math.floor(Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT)))
  ;(game.scale as any).setZoom?.(z)
}
setIntZoom()
window.addEventListener('resize', setIntZoom)
// Ensure stage defaults
const progStart = loadProgress()
if (!progStart.currentStage || progStart.currentStage < 1) {
  progStart.currentStage = Math.max(1, progStart.highestUnlocked || 1)
  saveProgress(progStart)
}

function openSettings() {
  settingsOverlay.classList.add('visible')
  settingsOverlay.setAttribute('aria-hidden', 'false')
  if (loadSettings().scanMode) startScan(settingsOverlay)
}
function closeSettings() {
  settingsOverlay.classList.remove('visible')
  settingsOverlay.setAttribute('aria-hidden', 'true')
}

// Expose minimal for debugging
Object.assign(window, { __game: () => game })

// no start overlay

// Face indicator direction arrow
window.addEventListener('face:dir', (e: any) => {
  const dir = e.detail as ('left'|'right'|'up'|'down'|null)
  const el = faceIndicator
  if (!el) return
  const deg = dir === 'up' ? 0 : dir === 'right' ? 90 : dir === 'down' ? 180 : dir === 'left' ? 270 : null
  if (deg == null) { el.style.setProperty('--rot', '0'); el.style.opacity = '0.4' }
  else { el.style.opacity = '1'; el.style.transform = `rotate(${deg}deg)` }
})

// Voice → UI wiring
window.addEventListener('voice:command', (e: Event) => {
  const d = (e as CustomEvent).detail as any
  if (!d || d.type !== 'ui') return
  if (d.action === 'open_settings') { if (btnSettings && btnSettings.style.display !== 'none') openSettings() }
  else if (d.action === 'close_settings') closeSettings()
  else if (d.action === 'toggle_contrast') updateSettings({ highContrast: !settings.highContrast })
  else if (d.action === 'toggle_scan') updateSettings({ scanMode: !settings.scanMode })
  else if (d.action === 'set_difficulty') updateSettings({ difficulty: d.value })
  else if (d.action === 'set_movement') updateSettings({ movementMode: d.value })
})

// Run Complete overlay wiring
function fmt(sec: number) { const m = Math.floor(sec / 60); const s = sec % 60; return `${m}:${s.toString().padStart(2, '0')}` }
// Legacy cost function kept for reference (not used in new flow)

function openRunover(detail: { reason: 'time'|'defeat', stage: number, survived: number, level: number, kills: number }) {
  const reason = detail.reason === 'time' ? 'Time up' : 'Defeat'
  runoverSummary.textContent = `Stage ${detail.stage} — ${reason} — Time ${fmt(detail.survived)} — Lv ${detail.level} — Kills ${detail.kills}`
  runoverOverlay.classList.add('visible')
  runoverOverlay.setAttribute('aria-hidden', 'false')
  btnNextStage.disabled = detail.reason === 'time' ? true : true
  btnNextStage.textContent = 'Next Stage'
  if (detail.reason === 'time') {
    stageRewards.querySelectorAll('button').forEach(b => b.removeAttribute('aria-selected'))
    stageRewards.setAttribute('aria-hidden', 'false')
    stageRewards.classList.add('visible')
  } else {
    stageRewards.setAttribute('aria-hidden', 'true')
    stageRewards.classList.remove('visible')
  }
  if (settings.scanMode) startScan(runoverOverlay)
}

window.addEventListener('runover:open', (e: any) => openRunover(e.detail))

function restartGame() {
  const g: any = game
  if (!g) return
  const scene = g.scene.getScene('game')
  if (scene) scene.scene.restart()
  runoverOverlay.classList.remove('visible')
  runoverOverlay.setAttribute('aria-hidden', 'true')
  stageRewards.setAttribute('aria-hidden', 'true')
  stageRewards.classList.remove('visible')
}

btnNextStage?.addEventListener('click', () => {
  const prog = loadProgress()
  prog.currentStage = Math.max(1, (prog.currentStage || 1) + 1)
  saveProgress(prog)
  restartGame()
})
btnRetry?.addEventListener('click', () => { clearRunState(); restartGame() })
btnMenu?.addEventListener('click', () => {
  runoverOverlay.classList.remove('visible')
  runoverOverlay.setAttribute('aria-hidden', 'true')
  clearRunState()
  const g: any = game
  if (g) g.scene.start('menu')
})

function chooseReward(r: 'magnet' | 'blast') {
  addReward(r)
  btnNextStage.disabled = false
  stageRewards.querySelectorAll('button').forEach(b => b.removeAttribute('aria-selected'))
  const btn = stageRewards.querySelector(`[data-reward="${r}"]`)
  if (btn) btn.setAttribute('aria-selected', 'true')
}

btnRewardMagnet?.addEventListener('click', () => chooseReward('magnet'))
btnRewardBlast?.addEventListener('click', () => chooseReward('blast'))

// Pause overlay wiring
window.addEventListener('pause:open', () => {
  pauseOverlay.classList.add('visible')
  pauseOverlay.setAttribute('aria-hidden', 'false')
  if (loadSettings().scanMode) startScan(pauseOverlay)
})
btnResume?.addEventListener('click', () => {
  pauseOverlay.classList.remove('visible')
  pauseOverlay.setAttribute('aria-hidden', 'true')
  window.dispatchEvent(new CustomEvent('pause:resume'))
})
btnQuit?.addEventListener('click', () => {
  pauseOverlay.classList.remove('visible')
  pauseOverlay.setAttribute('aria-hidden', 'true')
  clearRunState()
  const g: any = game
  if (g) g.scene.start('menu')
  settingsOverlay.classList.remove('visible')
  settingsOverlay.setAttribute('aria-hidden', 'true')
})

// Level Up pause signals (GameScene also handles pause/resume)
window.addEventListener('pause:levelup_open', () => {})
window.addEventListener('pause:levelup_close', () => {})

// Menu scene notifications
window.addEventListener('ui:inMenu', () => {
  document.getElementById('topbar')?.setAttribute('aria-hidden', 'true')
})

// Toggle Settings availability only in practice
window.addEventListener('ui:practiceMode', (e: any) => {
  const enabled = !!e.detail?.enabled
  document.getElementById('topbar')?.setAttribute('aria-hidden', enabled ? 'false' : 'true')
  if (btnSettings) btnSettings.style.display = enabled ? '' : 'none'
  document.body.classList.toggle('practice-mode', enabled)
  if (enabled) { openSettings(); btnCloseSettings.style.display = 'none' }
  else { btnCloseSettings.style.display = ''; settingsOverlay.classList.remove('visible'); settingsOverlay.setAttribute('aria-hidden', 'true') }
})

// Allow scenes to open Settings (practice startup)
window.addEventListener('ui:openSettings', () => openSettings())

// Sidebar Start Run → let GameScene handle transition
btnStartRun?.addEventListener('click', () => {
  window.dispatchEvent(new CustomEvent('ui:start_run'))
})
