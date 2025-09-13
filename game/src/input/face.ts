import { type SettingsState, loadSettings } from '../state/settings'

// MediaPipe Tasks Vision
// Using CDN-resolved WASM for simplicity; keep this optional & behind a toggle.
let FaceLandmarker: any
let FilesetResolver: any

type Options = {
  onMove: (dir: 'left'|'right'|'up'|'down'|null) => void
}

let running = false
let videoEl: HTMLVideoElement | null = null
let landmarker: any | null = null
let rafId: number | null = null
let lastDir: 'left'|'right'|'up'|'down'|null = null
let settingsCache: SettingsState = loadSettings()
let repeatTimer: number | null = null

async function ensureLibs() {
  if (FaceLandmarker && FilesetResolver) return
  const mod = await import('@mediapipe/tasks-vision')
  FaceLandmarker = (mod as any).FaceLandmarker
  FilesetResolver = (mod as any).FilesetResolver
}

async function initLandmarker() {
  await ensureLibs()
  const fileset = await FilesetResolver.forVisionTasks(
    // CDN base pinned to the same RC version as package.json
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'
  )
  landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm/face_landmarker.task',
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: false,
  })
}

function mouthOpenRatio(landmarks: any[]): number {
  // Use Face Mesh landmark indices: 13 (upper lip), 14 (lower lip)
  const upper = landmarks[13]
  const lower = landmarks[14]
  if (!upper || !lower) return 0
  const dy = Math.abs(upper.y - lower.y)
  return dy
}

function tiltDirection(landmarks: any[]): 'left'|'right'|'up'|'down'|null {
  // Use eyes line slope for roll tilt; and nose vs eyes for up/down (very rough)
  // Left eye (33), Right eye (263) in MediaPipe indices
  const le = landmarks[33]
  const re = landmarks[263]
  const nose = landmarks[1]
  if (!le || !re || !nose) return null
  const slope = (le.y - re.y)
  const horiz = (re.x - le.x)
  const tilt = slope / Math.max(0.0001, Math.abs(horiz))
  // Up/down rough cue based on nose y relative to eyes midpoint
  const midY = (le.y + re.y) / 2
  const v = midY - nose.y

  // thresholds tuned empirically; keep small to be gentle
  const t = settingsCache.faceTiltSensitivity
  if (tilt > t) return 'left'
  if (tilt < -t) return 'right'
  if (v > t * 0.75) return 'down'
  if (v < -t * 0.75) return 'up'
  return null
}

function startRepeater(onMove: Options['onMove'], dir: 'left'|'right'|'up'|'down'|null) {
  if (repeatTimer) { window.clearInterval(repeatTimer); repeatTimer = null }
  if (!dir) return
  repeatTimer = window.setInterval(() => onMove(dir), settingsCache.faceRepeatMs)
}

async function loop(onMove: Options['onMove']) {
  if (!running || !videoEl || !landmarker) return
  const now = performance.now()
  const res = await landmarker.detectForVideo(videoEl, now)
  if (res && res.faceLandmarks && res.faceLandmarks[0]) {
    const lms = res.faceLandmarks[0]
    const dir = tiltDirection(lms)
    if (dir !== lastDir) {
      lastDir = dir
      startRepeater(onMove, dir)
    }
    // Optional: mouth open to emit a click/select later
    const mouth = mouthOpenRatio(lms)
    if (mouth > 0.035) {
      // could dispatch a custom event, left for future
    }
  }
  rafId = requestAnimationFrame(() => loop(onMove))
}

export async function initFaceInput(toggleEl: HTMLInputElement, opts: Options) {
  const state: SettingsState = loadSettings()
  toggleEl.checked = !!state // UI reflects stored state; enabling handled in main

  toggleEl.addEventListener('change', async () => {
    if (toggleEl.checked) await start(opts)
    else stop()
  })
}

export async function start(opts: Options) {
  if (running) return
  try {
    await initLandmarker()
    // Camera setup
    videoEl = document.createElement('video')
    videoEl.autoplay = true
    videoEl.playsInline = true
    videoEl.muted = true

    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 360 } })
    videoEl.srcObject = stream
    await videoEl.play()

    running = true
    lastDir = null
    // Keep settings updated live
    window.addEventListener('settings:changed', (e: Event) => {
      const d = (e as CustomEvent).detail
      settingsCache = { ...settingsCache, ...d }
    })

    loop(dir => {
      // Map to our virtual nudge semantics
      if (dir) {
        window.dispatchEvent(new CustomEvent('face:dir', { detail: dir }))
        opts.onMove(dir)
      } else {
        window.dispatchEvent(new CustomEvent('face:dir', { detail: null }))
      }
    })
  } catch (err) {
    console.warn('Face input init failed:', err)
    // Emit neutral state and stop to leave UI consistent
    window.dispatchEvent(new CustomEvent('face:dir', { detail: null }))
    stop()
    throw err
  }
}

export function stop() {
  running = false
  if (rafId) cancelAnimationFrame(rafId)
  rafId = null
  if (repeatTimer) { window.clearInterval(repeatTimer); repeatTimer = null }
  if (videoEl && videoEl.srcObject) {
    for (const t of (videoEl.srcObject as MediaStream).getTracks()) t.stop()
  }
  videoEl = null
}
