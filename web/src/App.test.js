import { describe, expect, it } from 'vitest'
import {
  actionForState,
  clampSelection,
  restoreResults,
  restoreSelectedSongs,
  toggleSong,
  serializeResults,
  isSongToggleAllowed,
  renderDifficulty,
  renderStars,
  meetsGoal,
  defaultGear,
  calculateVoltageLoss,
  applyVoltageLoss,
} from './App'

describe('song selection gating', () => {
  const build = (phase, isSelected, count, max) => ({
    phase,
    isSelected,
    selectedCount: count,
    maxSelectable: max,
  })

  it('disables toggling once selecting phase ends', () => {
    expect(isSongToggleAllowed(build('entering', true, 3, 3))).toBe(false)
    expect(isSongToggleAllowed(build('done', false, 0, 3))).toBe(false)
  })

  it('allows deselection even at the max limit during selecting', () => {
    expect(isSongToggleAllowed(build('selecting', true, 3, 3))).toBe(true)
  })

  it('blocks new selections when max reached', () => {
    expect(isSongToggleAllowed(build('selecting', false, 3, 3))).toBe(false)
    expect(isSongToggleAllowed(build('selecting', false, 2, 3))).toBe(true)
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
      actionForState({
        phase: 'idle',
        startEnabled: true,
        hasSelection: false,
        canEnter: false,
        starsComplete: false,
        canAdvanceRow: false,
        canAdvanceAct: false,
      }),
    ).toEqual({ kind: 'start', label: 'Start challenge', disabled: false })
    expect(
      actionForState({
        phase: 'selecting',
        hasSelection: false,
        startEnabled: true,
        starsComplete: false,
        canAdvanceRow: false,
        canAdvanceAct: false,
        canEnter: false,
      }),
    ).toMatchObject({ kind: 'enter', disabled: true })
    expect(
      actionForState({
        phase: 'entering',
        starsComplete: false,
        hasSelection: true,
        startEnabled: true,
        canAdvanceRow: false,
        canAdvanceAct: false,
        canEnter: true,
      }),
    ).toMatchObject({ kind: 'submit', disabled: true })
    expect(
      actionForState({
        phase: 'done',
        canAdvanceRow: true,
        canAdvanceAct: false,
        hasSelection: true,
        starsComplete: true,
        startEnabled: false,
      }),
    ).toMatchObject({ kind: 'advance', disabled: false })
    expect(
      actionForState({
        phase: 'done',
        canAdvanceRow: false,
        canAdvanceAct: true,
        hasSelection: true,
        starsComplete: true,
        startEnabled: false,
      }),
    ).toMatchObject({ kind: 'nextAct', disabled: false })
  })
})

describe('selection hydration helpers', () => {
  const acts = [
    {
      rows: [
        [
          {
            col: 0,
            challenge: {
              songs: [
                { id: 'a', title: 'A' },
                { id: 'b', title: 'B' },
              ],
            },
          },
        ],
      ],
    },
  ]

  it('restores selected songs by id', () => {
    const restored = restoreSelectedSongs(['b', 'missing'], acts, { act: 0, row: 0, col: 0 })
    expect(restored).toHaveLength(1)
    expect(restored[0].id).toBe('b')
  })

  it('clamps selection within act bounds', () => {
    const sel = clampSelection({ act: 5, row: 5, col: 99 }, acts)
    expect(sel).toEqual({ act: 0, row: 0, col: 0 })
  })

  it('serializes and restores results', () => {
    const serialized = serializeResults({ '0-0': { stars: [1, 2, 3], songs: [] } })
    expect(serialized['0-0'].stars).toEqual([1, 2, 3])
    const restored = restoreResults(serialized)
    expect(restored['0-0'].stars).toEqual([1, 2, 3])
  })

  it('creates default gear', () => {
    const gear = defaultGear()
    expect(Object.keys(gear)).toContain('Shirt')
    expect(gear.Shirt.name).toMatch(/None/i)
  })
})

describe('toggleSong', () => {
  const songA = { id: 'a' }
  const songB = { id: 'b' }
  it('prevents dropping below minSelectable', () => {
    const res = toggleSong([songA, songB], songA, { minSelectable: 2, maxSelectable: 5 })
    expect(res).toEqual([songA, songB])
  })

  it('caps at maxSelectable', () => {
    const res = toggleSong([songA, songB], { id: 'c' }, { minSelectable: 1, maxSelectable: 2 })
    expect(res).toEqual([songA, songB])
  })
})

describe('meetsGoal', () => {
  it('checks average against goal', () => {
    expect(meetsGoal(3, [3, 3, 3])).toBe(true)
    expect(meetsGoal(4, [3, 3, 3])).toBe(false)
  })
})

describe('voltage tracking', () => {
  it('charges 1000 volts per missing star', () => {
    const loss = calculateVoltageLoss([6, 5, 0])
    expect(loss).toBe(7000)
  })

  it('never drops below zero after applying loss', () => {
    const { remaining, loss } = applyVoltageLoss(2000, [0, 0, 0])
    expect(loss).toBe(18000)
    expect(remaining).toBe(0)
  })
})
