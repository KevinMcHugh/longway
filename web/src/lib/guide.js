export const GUIDE_STORAGE_KEY = 'longway-guide-v1'

export const guideSteps = [
  {
    id: 'welcome',
    title: 'Welcome to the Climb',
    body: 'Pick a route on the map, clear each challenge row by row, and reach the top of every act.',
  },
  {
    id: 'start',
    title: 'Start a Challenge',
    body: 'From Map mode, select a reachable node and press Start challenge.',
  },
  {
    id: 'play-song',
    title: 'Play Outside This App',
    body: 'When a challenge starts, play the listed song(s) in your rhythm game, then return here to enter your star results.',
  },
  {
    id: 'voltage',
    title: 'Protect Your Voltage',
    body: 'Missing goals drains voltage. Keep it above zero, advance rows, and watch for shop nodes to upgrade gear.',
  },
]

export function readGuideState() {
  if (typeof localStorage === 'undefined') {
    return { seen: false }
  }
  const raw = localStorage.getItem(GUIDE_STORAGE_KEY)
  if (!raw) return { seen: false }
  try {
    const parsed = JSON.parse(raw)
    return { seen: Boolean(parsed?.seen) }
  } catch (_) {
    return { seen: false }
  }
}

export function markGuideSeen() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify({ seen: true }))
  } catch (_) {
    // ignore storage errors
  }
}

export function resetGuideSeen() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(GUIDE_STORAGE_KEY)
  } catch (_) {
    // ignore storage errors
  }
}
