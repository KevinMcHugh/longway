export const GUIDE_STORAGE_KEY = 'longway-guide-v1'

export const guideFlows = {
  intro: [
    {
      id: 'concept',
      title: 'Roguelike + Rhythm',
      body: 'This game is a roguelike strategy layer that sits alongside your existing rhythm game. Plan your route here, then perform songs there.',
    },
    {
      id: 'select-challenge',
      title: 'Choose Your First Node',
      body: 'Open Map mode, select a reachable challenge node, and press Start challenge when ready.',
    },
  ],
  'play-loop': [
    {
      id: 'play-loop',
      title: 'Play Songs Outside This App',
      body: 'Now play the selected song(s) in your rhythm game, then come back here to enter your star results.',
    },
  ],
  'score-entry': [
    {
      id: 'score-entry',
      title: 'Enter Your Results',
      body: 'Use Enter stars to record your performance. Results decide voltage loss and whether your run continues.',
    },
  ],
}

export function getGuideFlow(flowId) {
  return guideFlows[ flowId ] || []
}

export function readGuideState() {
  if (typeof localStorage === 'undefined') {
    return { seen: {} }
  }
  const raw = localStorage.getItem(GUIDE_STORAGE_KEY)
  if (!raw) return { seen: {} }
  try {
    const parsed = JSON.parse(raw)
    const seen = parsed?.seen && typeof parsed.seen === 'object' ? parsed.seen : {}
    return { seen }
  } catch (_) {
    return { seen: {} }
  }
}

export function hasSeenGuide(flowId) {
  return Boolean(readGuideState().seen?.[ flowId ])
}

export function markGuideSeen(flowId) {
  if (typeof localStorage === 'undefined') return
  try {
    const current = readGuideState()
    localStorage.setItem(
      GUIDE_STORAGE_KEY,
      JSON.stringify({
        seen: {
          ...current.seen,
          [ flowId ]: true,
        },
      }),
    )
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
