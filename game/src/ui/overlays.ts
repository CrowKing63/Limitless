import { loadSettings } from '../state/settings'
import { startScan } from './scan'

type LevelUpResolver = (choiceIndex: number) => void

const levelupOverlay = document.getElementById('levelup-overlay') as HTMLElement
const levelupChoices = document.getElementById('lvlup-choices') as HTMLElement

let resolver: LevelUpResolver | null = null
let stopScan: (() => void) | null = null

function cleanup() {
  document.removeEventListener('keydown', onKey)
  resolver = null
  if (stopScan) { stopScan(); stopScan = null }
  for (const btn of Array.from(levelupChoices.querySelectorAll('button'))) {
    btn.removeAttribute('aria-selected')
  }
}

function onKey(e: KeyboardEvent) {
  if (!resolver) return
  const key = e.key
  const idx = key === '1' ? 0 : key === '2' ? 1 : key === '3' ? 2 : -1
  if (idx >= 0) {
    e.preventDefault()
    choose(idx)
  }
  // Space/Enter handled by scan.ts for generic overlays
}

function choose(i: number) {
  if (!resolver) return
  levelupOverlay.classList.remove('visible')
  levelupOverlay.setAttribute('aria-hidden', 'true')
  const r = resolver
  cleanup()
  // Notify to resume immediately; also covered by transitionend
  window.dispatchEvent(new CustomEvent('pause:levelup_close'))
  r(i)
}

export function openLevelUp(choices: string[]): Promise<number> {
  // Render choices dynamically
  levelupChoices.innerHTML = ''
  choices.forEach((label, i) => {
    const btn = document.createElement('button')
    btn.setAttribute('role', 'option')
    btn.dataset.choice = String(i + 1)
    btn.textContent = `${label} (${i + 1})`
    btn.addEventListener('click', () => choose(i))
    levelupChoices.appendChild(btn)
  })

  levelupOverlay.classList.add('visible')
  levelupOverlay.setAttribute('aria-hidden', 'false')

  document.addEventListener('keydown', onKey)

   // Start scan mode if enabled
  if (loadSettings().scanMode) stopScan = startScan(levelupOverlay)

  // Signal game scene to fully pause physics/timers
  window.dispatchEvent(new CustomEvent('pause:levelup_open'))

  return new Promise<number>(resolve => {
    resolver = resolve
  })
}

// Voice integration helper: attempt to select Nth choice (1-based)
export function voiceSelect(n: number): boolean {
  if (!levelupOverlay.classList.contains('visible')) return false
  const btn = levelupChoices.querySelector<HTMLButtonElement>(`button:nth-child(${n})`)
  if (btn) {
    btn.click()
    return true
  }
  return false
}

// When the overlay is hidden via click/selection, let the scene resume.
levelupOverlay?.addEventListener('transitionend', () => {
  if (!levelupOverlay.classList.contains('visible')) {
    window.dispatchEvent(new CustomEvent('pause:levelup_close'))
  }
})
