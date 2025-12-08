import { describe, expect, it } from 'vitest'
import { isSongToggleAllowed, renderDifficulty } from './App'

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
