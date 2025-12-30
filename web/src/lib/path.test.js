import { describe, expect, it } from 'vitest'
import {
  generateRun,
  nodeKinds,
  songs,
  shortSongChallenge,
  mediumSongChallenge,
  epicSongChallenge,
  genreChallenge,
  filterSongsByOrigin,
  songOrigins,
} from './path'

describe('path generation', () => {
  it('places boss at the top row of each act and ensures connectivity', () => {
    const { acts } = generateRun(123)

    acts.forEach((act) => {
      const top = act.rows[act.rows.length - 1]
      expect(top).toHaveLength(1)
      expect(top[0].kind).toBe(nodeKinds.boss)
      expect(top[0].challenge?.songs?.[0]?.title).toBe('Bohemian Rhapsody')
      const shopRows = act.rows
        .map((row, idx) => ({ row, idx }))
        .filter(({ row }) => row[0]?.kind === nodeKinds.shop)
      expect(shopRows.length).toBeGreaterThanOrEqual(2)
      shopRows.forEach(({ idx }, i) => {
        if (i === 0) return
        expect(Math.abs(shopRows[i - 1].idx - idx)).toBeGreaterThan(1)
      })

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

  it('limits challenge selection to 1-3 songs while pools stay act-sized', () => {
    const { acts } = generateRun(1234)
    acts.forEach((act) => {
      act.rows.forEach((row) => {
        row.forEach((node) => {
          if (node.kind === nodeKinds.boss) return
          if (!node.challenge || !node.challenge.songs) return
          const len = node.challenge.songs.length
          expect(node.challenge.selectCount).toBeGreaterThanOrEqual(1)
          expect(node.challenge.selectCount).toBeLessThanOrEqual(3)
          expect(len).toBeGreaterThanOrEqual(node.challenge.selectCount)
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

  it('avoids duplicate wording in genre summaries', () => {
    const rng = () => 0.5
    const pool = [
      { id: 'g1', genre: 'Indie Rock', seconds: 200 },
      { id: 'g2', genre: 'Indie Rock', seconds: 210 },
      { id: 'g3', genre: 'Indie Rock', seconds: 220 },
      { id: 'g4', genre: 'Indie Rock', seconds: 230 },
    ]
    const genre = genreChallenge(pool, 4, rng, 1, 3)
    expect(genre.summary.includes('tracks tracks')).toBe(false)
  })

  it('filters runs by origin list while keeping the boss available', () => {
    const pool = [
      { id: 'a', origin: 'Origin A', title: 'Song A' },
      { id: 'b', origin: 'Origin B', title: 'Song B' },
      { id: 'c', origin: 'Origin A', title: 'Song C' },
      { id: 'boss', title: 'Bohemian Rhapsody', origin: 'Origin B' },
    ]
    const filtered = filterSongsByOrigin(pool, ['Origin A'])
    expect(filtered.some((s) => s.origin === 'Origin A')).toBe(true)
    expect(filtered.every((s) => s.origin === 'Origin A' || s.title === 'Bohemian Rhapsody')).toBe(
      true,
    )
  })

  it('exposes available song origins', () => {
    expect(songOrigins.length).toBeGreaterThan(0)
  })

  it('drops songs explicitly marked as not included', () => {
    const list = [
      { id: 'keep', title: 'Keep Me', source_included: true },
      { id: 'drop', title: 'Drop Me', source_included: false },
    ]
    const parsed = filterSongsByOrigin(list, null)
    expect(parsed.some((s) => s.id === 'drop')).toBe(false)
    expect(parsed.some((s) => s.id === 'keep')).toBe(true)
  })
})
