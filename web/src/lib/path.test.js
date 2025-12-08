import { describe, expect, it } from 'vitest'
import { generateRun, nodeKinds, songs } from './path'

describe('path generation', () => {
  it('places boss at the top row of each act and ensures connectivity', () => {
    const { acts } = generateRun(123)

    acts.forEach((act) => {
      const top = act.rows[act.rows.length - 1]
      expect(top).toHaveLength(1)
      expect(top[0].kind).toBe(nodeKinds.boss)
      expect(top[0].challenge?.songs?.[0]?.title).toBe('Bohemian Rhapsody')

      // every node except the first row should have incoming edges
      for (let r = 1; r < act.rows.length; r++) {
        for (let c = 0; c < act.rows[r].length; c++) {
          const hasIncoming = act.rows[r - 1].some((n) => n.edges.includes(c))
          expect(hasIncoming).toBe(true)

          // each node should have <=2 edges
          act.rows[r - 1].forEach((n) => {
            expect(n.edges.length).toBeLessThanOrEqual(2)
          })
        }
      }
    })
  })

  it('filters songs by act difficulty rules', () => {
    const { acts } = generateRun(999)

    const act1Songs = acts[0].rows[0][0].challenge.songs
    expect(act1Songs.every((s) => s.difficulty <= 3)).toBe(true)

    const act2Songs = acts[1].rows[0][0].challenge.songs
    expect(act2Songs.every((s) => s.difficulty <= 5)).toBe(true)

    const act3Songs = acts[2].rows[0][0].challenge.songs
    expect(act3Songs.every((s) => s.difficulty >= 3)).toBe(true)
  })

  it('draws from catalog songs', () => {
    const { acts } = generateRun(42)
    const anySongId = acts[0].rows[0][0].challenge.songs[0].id
    const exists = songs.some((s) => s.id === anySongId)
    expect(exists).toBe(true)
  })
})
