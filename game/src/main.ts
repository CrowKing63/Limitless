import './style.css'
import Phaser from 'phaser'
import { phaserConfig } from './game/config'
import { applySettingsToDocument, emitSettingsChanged, loadSettings, saveSettings, type SettingsState } from './state/settings'
import { addTokens, loadProgress, saveProgress, unlockNextStage, setCurrentStage } from './state/progress'
import { initSpeech } from './input/speech'
import { initFaceInput, start as startFace, stop as stopFace } from './input/face'
import { startScan } from './ui/scan'

// Initialize settings UI
const settings = loadSettings()
applySettingsToDocument(settings)
;(window as any)._settings = settings

const startOverlay = document.getElementById('start-overlay')!
const settingsOverlay = document.getElementById('settings-overlay')!
const btnStart = document.getElementById('btn-start') as HTMLButtonElement
const btnSettings = document.getElementById('btn-settings') as HTMLButtonElement
const btnCloseSettings = document.getElementById('btn-close-settings') as HTMLButtonElement
const btnPTT = document.getElementById('btn-ptt') as HTMLButtonElement
const chkContrast = document.getElementById('chk-contrast') as HTMLInputElement
const rngText = document.getElementById('rng-text') as HTMLInputElement
const chkScan = document.getElementById('chk-scan') as HTMLInputElement
const chkFace = document.getElementById('chk-face') as HTMLInputElement
const rngGain = document.getElementById('rng-gain') as HTMLInputElement
const rngMaxDist = document.getElementById('rng-maxdist') as HTMLInputElement
const rngCurve = document.getElementById('rng-curve') as HTMLInputElement
const faceIndicator = document.getElementById('face-indicator') as HTMLSpanElement
const rngArrive = document.getElementById('rng-arrive') as HTMLInputElement
const rngDeadzone = document.getElementById('rng-deadzone') as HTMLInputElement
const rngScan = document.getElementById('rng-scan') as HTMLInputElement
const chkDwell = document.getElementById('chk-dwell') as HTMLInputElement
const rngDwell = document.getElementById('rng-dwell') as HTMLInputElement
const rngTilt = document.getElementById('rng-tilt') as HTMLInputElement
const rngNudge = document.getElementById('rng-nudge') as HTMLInputElement
const rngRepeat = document.getElementById('rng-repeat') as HTMLInputElement
const diffRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="difficulty"]'))
const tutOverlay = document.getElementById('tutorial-overlay') as HTMLElement
const btnTutPractice = document.getElementById('btn-tut-practice') as HTMLButtonElement
const btnTutSkip = document.getElementById('btn-tut-skip') as HTMLButtonElement
// Run Complete overlay elements
const runoverOverlay = document.getElementById('runover-overlay') as HTMLElement
const runoverSummary = document.getElementById('runover-summary') as HTMLElement
const runoverReward = document.getElementById('runover-reward') as HTMLElement
const btnNextStage = document.getElementById('btn-next-stage') as HTMLButtonElement
const btnRetry = document.getElementById('btn-retry') as HTMLButtonElement
const btnMenu = document.getElementById('btn-menu') as HTMLButtonElement

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
diffRadios.forEach(r => (r.checked = r.value === settings.difficulty))

function updateSettings(partial: Partial<SettingsState>) {
  const next = { ...settings, ...partial }
  saveSettings(next)
  applySettingsToDocument(next)
  emitSettingsChanged(next)
  Object.assign(settings, next)
  ;(window as any)._settings = next
}

btnSettings.addEventListener('click', () => openSettings())
btnCloseSettings.addEventListener('click', () => closeSettings())
initSpeech(btnPTT)
chkFace.addEventListener('change', async () => {
  if (chkFace.checked) await startFace({ onMove: dir => window.dispatchEvent(new CustomEvent('voice:command', { detail: { type: 'move', dir } })) })
  else stopFace()
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
radios.forEach(r => r.addEventListener('change', () => updateSettings({ movementMode: (r.value as any) })))
diffRadios.forEach(r => r.addEventListener('change', () => updateSettings({ difficulty: (r.value as any) })))

let game: Phaser.Game | null = null
let stopStartScan: (() => void) | null = null
btnStart.addEventListener('click', () => {
  // Gesture gate achieved: create game instance
  if (!game) game = new Phaser.Game(phaserConfig)
  // Ensure current stage defaults to highest unlocked
  const progStart = loadProgress()
  if (!progStart.currentStage || progStart.currentStage < 1) {
    progStart.currentStage = Math.max(1, progStart.highestUnlocked || 1)
    saveProgress(progStart)
  }
  startOverlay.classList.remove('visible')
  if (!localStorage.getItem('limitless:tutorialSeen')) {
    tutOverlay.classList.add('visible')
    tutOverlay.setAttribute('aria-hidden', 'false')
  }
  if (stopStartScan) { stopStartScan(); stopStartScan = null }
})

// Tutorial wires
btnTutPractice?.addEventListener('click', () => {
  tutOverlay.classList.remove('visible')
  tutOverlay.setAttribute('aria-hidden', 'true')
  window.dispatchEvent(new CustomEvent('tutorial:practice'))
})
btnTutSkip?.addEventListener('click', () => {
  tutOverlay.classList.remove('visible')
  tutOverlay.setAttribute('aria-hidden', 'true')
  window.dispatchEvent(new CustomEvent('tutorial:play'))
  localStorage.setItem('limitless:tutorialSeen', '1')
})

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

// Start overlay scanning if needed
if (settings.scanMode && startOverlay.classList.contains('visible')) {
  stopStartScan = startScan(startOverlay)
}

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
  if (d.action === 'open_settings') openSettings()
  else if (d.action === 'close_settings') closeSettings()
  else if (d.action === 'toggle_contrast') updateSettings({ highContrast: !settings.highContrast })
  else if (d.action === 'toggle_scan') updateSettings({ scanMode: !settings.scanMode })
  else if (d.action === 'set_difficulty') updateSettings({ difficulty: d.value })
  else if (d.action === 'set_movement') updateSettings({ movementMode: d.value })
})

// Run Complete overlay wiring
function fmt(sec: number) { const m = Math.floor(sec / 60); const s = sec % 60; return `${m}:${s.toString().padStart(2, '0')}` }
function costForNext(stage: number) { return Math.min(20, 3 + (stage - 1) * 2) }

function openRunover(detail: { reason: 'time'|'defeat', stage: number, survived: number, level: number, kills: number, tokens: number }) {
  // Award tokens and refresh progress
  addTokens(detail.tokens)
  const prog = loadProgress()
  const cost = costForNext(prog.highestUnlocked)
  const reason = detail.reason === 'time' ? 'Time up' : 'Defeat'
  runoverSummary.textContent = `Stage ${detail.stage} — ${reason} — Time ${fmt(detail.survived)} — Lv ${detail.level} — Kills ${detail.kills}`
  runoverReward.textContent = `Tokens earned: ${detail.tokens} (Total: ${prog.tokens})`
  runoverOverlay.classList.add('visible')
  runoverOverlay.setAttribute('aria-hidden', 'false')
  const canUnlock = prog.tokens >= cost
  btnNextStage.disabled = !canUnlock
  btnNextStage.textContent = canUnlock ? `Next Stage (cost ${cost})` : `Need ${cost - prog.tokens} more`
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
}

btnNextStage?.addEventListener('click', () => {
  const prog = loadProgress()
  const cost = costForNext(prog.highestUnlocked)
  if (unlockNextStage(cost)) restartGame()
  else openRunover({ reason: 'time', stage: prog.currentStage, survived: 0, level: 0, kills: 0, tokens: 0 })
})
btnRetry?.addEventListener('click', () => restartGame())
btnMenu?.addEventListener('click', () => {
  runoverOverlay.classList.remove('visible')
  runoverOverlay.setAttribute('aria-hidden', 'true')
  startOverlay.classList.add('visible')
  if (settings.scanMode) stopStartScan = startScan(startOverlay)
})
