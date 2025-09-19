import './style.css'
import Phaser from 'phaser'
import { phaserConfig, GAME_WIDTH, GAME_HEIGHT } from './game/config'
import { applySettingsToDocument, defaultSettings, emitSettingsChanged, loadSettings, saveSettings, type SettingsState } from './state/settings'
import { loadProgress, saveProgress, resetProgress } from './state/progress'
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
const btnPresetVision = document.getElementById('btn-preset-vision') as HTMLButtonElement | null
const btnPresetMotor = document.getElementById('btn-preset-motor') as HTMLButtonElement | null
const btnPresetFocus = document.getElementById('btn-preset-focus') as HTMLButtonElement | null
const btnPresetReset = document.getElementById('btn-preset-reset') as HTMLButtonElement | null
const statusRegion = document.getElementById('settings-status') as HTMLElement | null
const valText = document.getElementById('val-text') as HTMLElement | null
const valArrive = document.getElementById('val-arrive') as HTMLElement | null
const valDeadzone = document.getElementById('val-deadzone') as HTMLElement | null
const valGain = document.getElementById('val-gain') as HTMLElement | null
const valMaxDist = document.getElementById('val-maxdist') as HTMLElement | null
const valCurve = document.getElementById('val-curve') as HTMLElement | null
const valDwell = document.getElementById('val-dwell') as HTMLElement | null
const valScan = document.getElementById('val-scan') as HTMLElement | null
const valTilt = document.getElementById('val-tilt') as HTMLElement | null
const valNudge = document.getElementById('val-nudge') as HTMLElement | null
const valRepeat = document.getElementById('val-repeat') as HTMLElement | null
const valTele = document.getElementById('val-tele') as HTMLElement | null
// removed tutorial overlay
// Run Complete overlay elements
const runoverOverlay = document.getElementById('runover-overlay') as HTMLElement
const runoverSummary = document.getElementById('runover-summary') as HTMLElement
const runoverTitle = document.getElementById('runover-title') as HTMLElement
// Removed: token reward display
const stageRewards = document.getElementById('stage-rewards') as HTMLElement
const btnRewardMagnet = document.getElementById('reward-magnet') as HTMLButtonElement
const btnRewardBlast = document.getElementById('reward-blast') as HTMLButtonElement
const btnNextStage = document.getElementById('btn-next-stage') as HTMLButtonElement
const btnRetry = document.getElementById('btn-retry') as HTMLButtonElement
const btnMenu = document.getElementById('btn-menu') as HTMLButtonElement
let lastRunoverReason: 'time' | 'defeat' | null = null
// Pause overlay elements
const pauseOverlay = document.getElementById('pause-overlay') as HTMLElement
const btnResume = document.getElementById('btn-resume') as HTMLButtonElement
const btnQuit = document.getElementById('btn-quit') as HTMLButtonElement
// Practice sidebar Start Run button
const btnStartRun = document.getElementById('btn-start-run') as HTMLButtonElement | null

// Movement mode radios
const radios = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="moveMode"]'))

function setOutput(el: HTMLElement | null, text: string) {
  if (el) el.textContent = text
}

function formatSeconds(ms: number, fractionDigits = 1) {
  return `${(ms / 1000).toFixed(fractionDigits)} s`
}

function formatMultiplier(value: number) {
  return `${value.toFixed(2)}×`
}

function syncControls(state: SettingsState) {
  radios.forEach(r => (r.checked = r.value === state.movementMode))
  diffRadios.forEach(r => (r.checked = r.value === state.difficulty))
  chkContrast.checked = state.highContrast
  rngText.value = String(state.textScale)
  setOutput(valText, `${state.textScale}%`)
  chkScan.checked = state.scanMode
  chkDwell.checked = state.dwellEnabled
  rngDwell.value = String(state.dwellTime)
  setOutput(valDwell, formatSeconds(state.dwellTime))
  rngScan.value = String(state.scanInterval)
  setOutput(valScan, formatSeconds(state.scanInterval))
  rngArrive.value = String(state.clickArriveRadius)
  setOutput(valArrive, `${state.clickArriveRadius} px`)
  rngDeadzone.value = String(state.followDeadzone)
  setOutput(valDeadzone, `${state.followDeadzone} px`)
  rngGain.value = String(Math.round(state.followGain * 100))
  setOutput(valGain, formatMultiplier(state.followGain))
  rngMaxDist.value = String(state.followMaxDist)
  setOutput(valMaxDist, `${state.followMaxDist} px`)
  rngCurve.value = String(Math.round(state.followCurve * 100))
  setOutput(valCurve, formatMultiplier(state.followCurve))
  rngTilt.value = String(Math.round(state.faceTiltSensitivity * 1000))
  setOutput(valTilt, state.faceTiltSensitivity.toFixed(2))
  rngNudge.value = String(state.faceNudgeDistance)
  setOutput(valNudge, `${state.faceNudgeDistance} px`)
  rngRepeat.value = String(state.faceRepeatMs)
  setOutput(valRepeat, formatSeconds(state.faceRepeatMs))
  if (rngTele) {
    rngTele.value = String(state.telegraphMs)
    setOutput(valTele, formatSeconds(state.telegraphMs, 2))
  }
  if (chkTeleBold) chkTeleBold.checked = state.telegraphBold
  if (selPalette) selPalette.value = state.palette
  if (chkBulletBold) chkBulletBold.checked = state.projectileBold
  if (chkShake) chkShake.checked = state.screenShake
}

let statusTimer: number | null = null

function announce(message: string) {
  if (!statusRegion) return
  statusRegion.textContent = ''
  statusRegion.classList.remove('visible')
  void statusRegion.offsetWidth
  statusRegion.textContent = message
  statusRegion.classList.add('visible')
  if (statusTimer != null) window.clearTimeout(statusTimer)
  statusTimer = window.setTimeout(() => {
    if (!statusRegion) return
    statusRegion.classList.remove('visible')
    statusRegion.textContent = ''
    statusTimer = null
  }, 6000)
}

syncControls(settings)
chkFace.checked = false

function updateSettings(partial: Partial<SettingsState>) {
  const next = { ...settings, ...partial }
  saveSettings(next)
  applySettingsToDocument(next)
  emitSettingsChanged(next)
  Object.assign(settings, next)
  ;(window as any)._settings = next
  syncControls(next)
}

type PresetKey = 'vision' | 'motor' | 'focus' | 'reset'

function applyPreset(preset: PresetKey) {
  if (preset === 'vision') {
    updateSettings({
      highContrast: true,
      textScale: Math.max(settings.textScale, 130),
      telegraphBold: true,
      palette: 'high',
      projectileBold: true,
    })
    announce('Vision clarity preset applied. High contrast, larger text, and bright projectiles are enabled.')
  } else if (preset === 'motor') {
    updateSettings({
      movementMode: 'click',
      clickArriveRadius: 12,
      followDeadzone: 24,
      followGain: 0.9,
      followMaxDist: 220,
      followCurve: 0.9,
      scanMode: true,
      dwellEnabled: true,
      dwellTime: 1200,
    })
    announce('Easy input preset applied. Click-to-move, dwell activation, and scan assistance are now on.')
  } else if (preset === 'focus') {
    updateSettings({
      difficulty: 'relaxed',
      telegraphMs: 260,
      telegraphBold: true,
      screenShake: false,
      faceRepeatMs: 400,
    })
    announce('Calm pacing preset applied. Attacks telegraph longer and intense effects are reduced.')
  } else if (preset === 'reset') {
    updateSettings({ ...defaultSettings })
    chkFace.checked = false
    stopFace()
    announce('All settings reset to their default values.')
  }
  if (settingsOverlay.classList.contains('visible')) {
    if (stopSettingsScan) {
      stopSettingsScan()
      stopSettingsScan = null
    }
    if (settings.scanMode) stopSettingsScan = startScan(settingsOverlay)
  }
}

let stopSettingsScan: (() => void) | null = null
let stopRunoverScan: (() => void) | null = null
let stopPauseScan: (() => void) | null = null

btnSettings?.addEventListener('click', () => openSettings())
btnCloseSettings.addEventListener('click', () => closeSettings())
btnAdv?.addEventListener('click', () => {
  const on = !settingsOverlay.classList.contains('advanced')
  settingsOverlay.classList.toggle('advanced', on)
  if (btnAdv) {
    btnAdv.textContent = on ? 'Hide advanced controls ▴' : 'Show advanced controls ▾'
    btnAdv.setAttribute('aria-pressed', on ? 'true' : 'false')
    btnAdv.setAttribute('aria-expanded', on ? 'true' : 'false')
  }
  announce(on ? 'Advanced accessibility controls shown.' : 'Advanced accessibility controls hidden.')
})
btnPresetVision?.addEventListener('click', () => applyPreset('vision'))
btnPresetMotor?.addEventListener('click', () => applyPreset('motor'))
btnPresetFocus?.addEventListener('click', () => applyPreset('focus'))
btnPresetReset?.addEventListener('click', () => applyPreset('reset'))
if (btnPTT) initSpeech(btnPTT)
chkFace.addEventListener('change', async () => {
  if (chkFace.checked) {
    try {
      await startFace({ onMove: dir => window.dispatchEvent(new CustomEvent('voice:command', { detail: { type: 'move', dir } })) })
      announce('Face gestures enabled. Tilt left, right, up, or down to issue movement nudges.')
    } catch {
      chkFace.checked = false
      announce('Face gestures could not start. Check camera permissions and try again.')
      // Non-blocking user feedback; rely on browser permission UI
      console.warn('Face gestures unavailable (camera or model load failed).')
    }
  } else {
    stopFace()
    announce('Face gestures disabled.')
  }
})
initFaceInput(chkFace, { onMove: () => {} })
chkContrast.addEventListener('change', () => updateSettings({ highContrast: chkContrast.checked }))
rngText.addEventListener('input', () => updateSettings({ textScale: Number(rngText.value) }))
chkScan.addEventListener('change', () => {
  updateSettings({ scanMode: chkScan.checked })
  if (settingsOverlay.classList.contains('visible')) {
    if (stopSettingsScan) {
      stopSettingsScan()
      stopSettingsScan = null
    }
    if (chkScan.checked) stopSettingsScan = startScan(settingsOverlay)
  }
  announce(chkScan.checked ? 'One-switch scan mode enabled. Focus will move through controls automatically.' : 'Scan mode disabled.')
})
chkDwell.addEventListener('change', () => {
  updateSettings({ dwellEnabled: chkDwell.checked })
  announce(chkDwell.checked ? 'Dwell activation enabled. Hover to click automatically.' : 'Dwell activation disabled.')
})
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
  if (stopSettingsScan) {
    stopSettingsScan()
    stopSettingsScan = null
  }
  if (settings.scanMode) stopSettingsScan = startScan(settingsOverlay)
}
function closeSettings() {
  settingsOverlay.classList.remove('visible')
  settingsOverlay.setAttribute('aria-hidden', 'true')
  if (stopSettingsScan) {
    stopSettingsScan()
    stopSettingsScan = null
  }
  if (statusRegion) {
    statusRegion.classList.remove('visible')
    statusRegion.textContent = ''
  }
  if (statusTimer != null) {
    window.clearTimeout(statusTimer)
    statusTimer = null
  }
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
  lastRunoverReason = detail.reason
  const reason = detail.reason === 'time' ? 'Time up' : 'Defeat'
  runoverSummary.textContent = `Stage ${detail.stage} — ${reason} — Time ${fmt(detail.survived)} — Lv ${detail.level} — Kills ${detail.kills}`
  runoverOverlay.classList.add('visible')
  runoverOverlay.setAttribute('aria-hidden', 'false')
  if (detail.reason === 'defeat') {
    runoverTitle.textContent = 'Game Over'
    btnNextStage.style.display = 'none'
    btnRetry.style.display = 'none'
    stageRewards.setAttribute('aria-hidden', 'true')
    stageRewards.classList.remove('visible')

    stageRewards.style.display = 'none'


    clearRunState()
    resetProgress()
  } else {
    runoverTitle.textContent = 'Run Complete'
    btnNextStage.textContent = 'Next Stage'
    btnNextStage.disabled = true
    btnNextStage.style.display = ''
    btnRetry.style.display = ''
    stageRewards.querySelectorAll('button').forEach(b => b.removeAttribute('aria-selected'))
    stageRewards.setAttribute('aria-hidden', 'false')
    stageRewards.classList.add('visible')

    stageRewards.style.display = ''


  }
  if (stopRunoverScan) {
    stopRunoverScan()
    stopRunoverScan = null
  }
  if (settings.scanMode) stopRunoverScan = startScan(runoverOverlay)
}

window.addEventListener('runover:open', (e: any) => openRunover(e.detail))

function restartGame() {
  const g: any = game
  if (!g) return
  const scene = g.scene.getScene('game')
  if (scene) scene.scene.restart()
  if (stopRunoverScan) {
    stopRunoverScan()
    stopRunoverScan = null
  }
  runoverOverlay.classList.remove('visible')
  runoverOverlay.setAttribute('aria-hidden', 'true')
  stageRewards.setAttribute('aria-hidden', 'true')
  stageRewards.classList.remove('visible')
  stageRewards.style.display = 'none'
}

btnNextStage?.addEventListener('click', () => {
  const prog = loadProgress()
  prog.currentStage = Math.max(1, (prog.currentStage || 1) + 1)
  saveProgress(prog)
  restartGame()
})
btnRetry?.addEventListener('click', () => { clearRunState(); restartGame() })
btnMenu?.addEventListener('click', () => {
  if (stopRunoverScan) {
    stopRunoverScan()
    stopRunoverScan = null
  }
  runoverOverlay.classList.remove('visible')
  runoverOverlay.setAttribute('aria-hidden', 'true')
  clearRunState()
  if (lastRunoverReason === 'defeat') resetProgress()
  const g: any = game
  if (g) {
    g.scene.stop('game')
    g.scene.start('menu')
  }
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
  if (stopPauseScan) {
    stopPauseScan()
    stopPauseScan = null
  }
  if (settings.scanMode) stopPauseScan = startScan(pauseOverlay)
})
btnResume?.addEventListener('click', () => {
  pauseOverlay.classList.remove('visible')
  pauseOverlay.setAttribute('aria-hidden', 'true')
  if (stopPauseScan) {
    stopPauseScan()
    stopPauseScan = null
  }
  window.dispatchEvent(new CustomEvent('pause:resume'))
})
btnQuit?.addEventListener('click', () => {
  pauseOverlay.classList.remove('visible')
  pauseOverlay.setAttribute('aria-hidden', 'true')
  if (stopPauseScan) {
    stopPauseScan()
    stopPauseScan = null
  }
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
  else {
    btnCloseSettings.style.display = ''
    closeSettings()
  }
})

// Allow scenes to open Settings (practice startup)
window.addEventListener('ui:openSettings', () => openSettings())

// Sidebar Start Run → let GameScene handle transition
btnStartRun?.addEventListener('click', () => {
  window.dispatchEvent(new CustomEvent('ui:start_run'))
})
