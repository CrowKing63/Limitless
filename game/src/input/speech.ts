import { voiceSelect } from '../ui/overlays'

// Minimal typings to avoid depending on experimental lib definitions
declare global {
  interface Window {
    webkitSpeechRecognition?: any
    SpeechRecognition?: any
  }
}
type SpeechRecognitionEvent = any

type Cmd =
  | { type: 'move', dir: 'up'|'down'|'left'|'right' }
  | { type: 'stop' }
  | { type: 'select', index: 1|2|3 }
  | { type: 'ui', action: 'open_settings' | 'close_settings' | 'toggle_contrast' | 'toggle_scan' | 'set_difficulty' | 'set_movement', value?: string }

function dispatch(cmd: Cmd) {
  window.dispatchEvent(new CustomEvent('voice:command', { detail: cmd }))
}

function mapTranscript(s: string): Cmd | null {
  const t = s.trim().toLowerCase()
  // Numbers / selections
  if (/(^|\s)(1|one|하나|일번)($|\s)/.test(t)) return { type: 'select', index: 1 }
  if (/(^|\s)(2|two|둘|이번)($|\s)/.test(t)) return { type: 'select', index: 2 }
  if (/(^|\s)(3|three|셋|삼번)($|\s)/.test(t)) return { type: 'select', index: 3 }

  // Directions
  if (/\b(up|위)\b/.test(t)) return { type: 'move', dir: 'up' }
  if (/(down|아래)/.test(t)) return { type: 'move', dir: 'down' }
  if (/(left|왼쪽)/.test(t)) return { type: 'move', dir: 'left' }
  if (/(right|오른쪽)/.test(t)) return { type: 'move', dir: 'right' }

  // Stop
  if (/(stop|정지|멈춰)/.test(t)) return { type: 'stop' }

  // UI controls
  if (/(settings|설정)/.test(t)) return { type: 'ui', action: 'open_settings' }
  if (/(닫기|close)/.test(t)) return { type: 'ui', action: 'close_settings' }
  if (/(고대비|contrast)/.test(t)) return { type: 'ui', action: 'toggle_contrast' }
  if (/(스캔|scan)/.test(t)) return { type: 'ui', action: 'toggle_scan' }
  if (/(쉬움|relaxed)/.test(t)) return { type: 'ui', action: 'set_difficulty', value: 'relaxed' }
  if (/(보통|standard)/.test(t)) return { type: 'ui', action: 'set_difficulty', value: 'standard' }
  if (/(어려움|intense)/.test(t)) return { type: 'ui', action: 'set_difficulty', value: 'intense' }
  if (/(클릭|click)/.test(t)) return { type: 'ui', action: 'set_movement', value: 'click' }
  if (/(팔로우|따라|follow)/.test(t)) return { type: 'ui', action: 'set_movement', value: 'follow' }

  // Click could be added later to synthesize pointer clicks
  return null
}

export function initSpeech(btn: HTMLButtonElement) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) {
    btn.setAttribute('disabled', 'true')
    btn.title = 'Speech not supported. Use OS Voice Control or on-screen UI.'
    return
  }
  const rec = new SR()
  rec.continuous = true
  rec.interimResults = false
  rec.lang = navigator.language.startsWith('ko') ? 'ko-KR' : 'en-US'

  let active = false
  function start() {
    if (active) return
    active = true
    rec.start()
    btn.setAttribute('aria-pressed', 'true')
  }
  function stop() {
    if (!active) return
    active = false
    rec.stop()
    btn.setAttribute('aria-pressed', 'false')
  }
  btn.addEventListener('click', () => {
    active ? stop() : start()
  })

  rec.onresult = (ev: SpeechRecognitionEvent) => {
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      if (!ev.results[i].isFinal) continue
      const text = ev.results[i][0].transcript
      const cmd = mapTranscript(text)
      if (!cmd) continue
      if (cmd.type === 'select') {
        if (voiceSelect(cmd.index)) continue
      }
      dispatch(cmd)
    }
  }
  rec.onerror = () => stop()
  rec.onend = () => { if (active) rec.start() }
}
