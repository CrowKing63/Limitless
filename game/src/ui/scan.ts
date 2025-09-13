import { loadSettings } from '../state/settings'

type StopFn = () => void

export function startScan(container: HTMLElement): StopFn {
  const { scanMode, scanInterval, dwellEnabled, dwellTime } = loadSettings()
  if (!scanMode) return () => {}
  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>('button, [role="option"], [data-scan]')
  ).filter(el => !el.hasAttribute('disabled'))
  if (focusables.length === 0) return () => {}

  let idx = 0
  let timer: number | null = null
  let dwellTimer: number | null = null

  const mark = (i: number) => {
    focusables.forEach((el, ei) => el.setAttribute('aria-selected', ei === i ? 'true' : 'false'))
    focusables[i].focus()
    if (dwellEnabled) startDwell()
  }

  const startDwell = () => {
    if (!dwellEnabled) return
    if (dwellTimer) clearTimeout(dwellTimer)
    dwellTimer = window.setTimeout(() => {
      focusables[idx].click()
    }, dwellTime)
  }

  const clearAll = () => {
    if (timer) clearInterval(timer)
    if (dwellTimer) clearTimeout(dwellTimer)
    focusables.forEach(el => el.removeAttribute('aria-selected'))
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      focusables[idx].click()
    }
  }

  document.addEventListener('keydown', onKey)
  mark(idx)
  timer = window.setInterval(() => {
    idx = (idx + 1) % focusables.length
    mark(idx)
  }, scanInterval)

  return () => {
    clearAll()
    document.removeEventListener('keydown', onKey)
  }
}

