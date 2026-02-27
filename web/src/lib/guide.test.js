import { beforeEach, describe, expect, it } from 'vitest'
import {
  GUIDE_STORAGE_KEY,
  getGuideFlow,
  hasSeenGuide,
  markGuideSeen,
  readGuideState,
  resetGuideSeen,
} from './guide'

function createMockStorage() {
  let store = {}
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[ key ] : null
    },
    setItem(key, value) {
      store[ key ] = String(value)
    },
    removeItem(key) {
      delete store[ key ]
    },
    clear() {
      store = {}
    },
  }
}

describe('guide state', () => {
  beforeEach(() => {
    globalThis.localStorage = createMockStorage()
    localStorage.clear()
  })

  it('defaults to unseen', () => {
    expect(readGuideState()).toEqual({ seen: {} })
    expect(hasSeenGuide('intro')).toBe(false)
  })

  it('marks individual guides as seen', () => {
    markGuideSeen('intro')
    expect(hasSeenGuide('intro')).toBe(true)
    expect(hasSeenGuide('play-loop')).toBe(false)
    expect(readGuideState()).toEqual({ seen: { intro: true } })
  })

  it('resets guide state', () => {
    markGuideSeen('intro')
    resetGuideSeen()
    expect(localStorage.getItem(GUIDE_STORAGE_KEY)).toBeNull()
    expect(readGuideState()).toEqual({ seen: {} })
  })

  it('contains progressive guide flows', () => {
    const intro = getGuideFlow('intro')
    const playLoop = getGuideFlow('play-loop')
    const scoreEntry = getGuideFlow('score-entry')
    expect(intro).toHaveLength(2)
    expect(intro[ 0 ]?.body.toLowerCase()).toContain('roguelike')
    expect(intro[ 0 ]?.body.toLowerCase()).toContain('rhythm game')
    expect(intro[ 1 ]?.body.toLowerCase()).toContain('select')
    expect(playLoop[ 0 ]?.body.toLowerCase()).toContain('come back')
    expect(scoreEntry[ 0 ]?.body.toLowerCase()).toContain('enter')
  })
})
