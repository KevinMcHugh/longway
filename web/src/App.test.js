import { describe, expect, it } from 'vitest'
import { actionForState, isSongToggleAllowed, renderDifficulty, renderStars } from './App'

describe('song selection gating', () => {
  it('disables toggling once selecting phase ends', () => {
    expect(isSongToggleAllowed('entering', true, 3, 3)).toBe(false)
    expect(isSongToggleAllowed('done', false, 0, 3)).toBe(false)
  })

  it('allows deselection even at the max limit during selecting', () => {
    expect(isSongToggleAllowed('selecting', true, 3, 3)).toBe(true)
  })

  it('blocks new selections when max reached', () => {
    expect(isSongToggleAllowed('selecting', false, 3, 3)).toBe(false)
    expect(isSongToggleAllowed('selecting', false, 2, 3)).toBe(true)
  })
})

describe('renderDifficulty', () => {
  it('renders flames at max difficulty', () => {
    expect(renderDifficulty(6)).toBe('🔥')
  })

  it('renders red pips otherwise', () => {
    expect(renderDifficulty(5)).toBe('🔴🔴🔴🔴🔴')
  })

  it('renders a placeholder for zero', () => {
    expect(renderDifficulty(0)).toBe('•')
  })
})

describe('renderStars', () => {
  it('renders stars as emoji', () => {
    expect(renderStars(3)).toBe('⭐️⭐️⭐️')
  })

  it('renders dash for zero', () => {
    expect(renderStars(0)).toBe('—')
  })
})

describe('actionForState', () => {
  it('surfaces the right labels and disabled states', () => {
    expect(
      actionForState({ phase: 'idle', startEnabled: true, hasSelection: false, starsComplete: false, canAdvance: false }),
    ).toEqual({ kind: 'start', label: 'Start challenge', disabled: false })
    expect(
      actionForState({ phase: 'selecting', hasSelection: false, startEnabled: true, starsComplete: false, canAdvance: false }),
    ).toMatchObject({ kind: 'enter', disabled: true })
    expect(
      actionForState({ phase: 'entering', starsComplete: false, hasSelection: true, startEnabled: true, canAdvance: false }),
    ).toMatchObject({ kind: 'submit', disabled: true })
    expect(
      actionForState({ phase: 'done', canAdvance: true, hasSelection: true, starsComplete: true, startEnabled: false }),
    ).toMatchObject({ kind: 'advance', disabled: false })
  })
})
