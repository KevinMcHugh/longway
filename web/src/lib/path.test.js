import { describe, expect, it } from 'vitest'
import {
  generateRun,
  nodeKinds,
  songs,
  shortSongChallenge,
  mediumSongChallenge,
  epicSongChallenge,
} from './path'

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

  it('limits challenge pool sizes to 2-5 songs', () => {
    const { acts } = generateRun(1234)
    acts.forEach((act) => {
      act.rows.forEach((row) => {
        row.forEach((node) => {
          if (node.kind === nodeKinds.boss) return
          if (!node.challenge || !node.challenge.songs) return
          const len = node.challenge.songs.length
          expect(len).toBeGreaterThanOrEqual(2)
          expect(len).toBeLessThanOrEqual(5)
        })
      })
    })
  })

  it('creates short/medium/epic challenges with duration bounds', () => {
    const rng = () => 0.5
    const pool = [
      { id: 's1', seconds: 120 },
      { id: 's2', seconds: 140 },
      { id: 's3', seconds: 150 },
      { id: 'm1', seconds: 170 },
      { id: 'm2', seconds: 200 },
      { id: 'm3', seconds: 250 },
      { id: 'e1', seconds: 420 },
      { id: 'e2', seconds: 500 },
      { id: 'e3', seconds: 600 },
    ]

    const short = shortSongChallenge(pool, 5, rng)
    expect(short.songs.every((s) => s.seconds <= 150)).toBe(true)

    const medium = mediumSongChallenge(pool, 5, rng)
    expect(medium.songs.every((s) => s.seconds > 150 && s.seconds < 300)).toBe(true)

    const epic = epicSongChallenge(pool, 5, rng)
    expect(epic.songs.every((s) => s.seconds >= 420)).toBe(true)
  })

  it('assigns goals per act', () => {
    const { acts } = generateRun(7)
    expect(acts[0].rows[0][0].challenge.goal).toBe(3)
    expect(acts[1].rows[0][0].challenge.goal).toBe(4)
    expect(acts[2].rows[0][0].challenge.goal).toBe(5)
  })
})
