import { beforeEach, describe, expect, it } from 'vitest'
import {
  GUIDE_STORAGE_KEY,
  guideSteps,
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
    expect(readGuideState()).toEqual({ seen: false })
  })

  it('marks guide as seen', () => {
    markGuideSeen()
    expect(readGuideState()).toEqual({ seen: true })
  })

  it('resets guide state', () => {
    markGuideSeen()
    resetGuideSeen()
    expect(localStorage.getItem(GUIDE_STORAGE_KEY)).toBeNull()
    expect(readGuideState()).toEqual({ seen: false })
  })

  it('has onboarding content for song play and score entry loop', () => {
    const playStep = guideSteps.find((s) => s.id === 'play-song')
    expect(playStep?.body.toLowerCase()).toContain('rhythm game')
    expect(playStep?.body.toLowerCase()).toContain('enter your star')
  })
})
