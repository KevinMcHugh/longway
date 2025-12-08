import songsCsv from '../data/downloaded_songs.csv?raw'

const totalActs = 3
const rowsPerAct = 8
const minNodesPerRow = 2
const maxNodesPerRow = 5

const poolBounds = {
  1: { min: 9, max: 12 },
  2: { min: 6, max: 9 },
  3: { min: 3, max: 5 },
}

export const nodeKinds = {
  challenge: 'challenge',
  boss: 'boss',
}

const catalog = ensureBoss(parseSongs(songsCsv))
export const songs = catalog

export function generateRun(seed = Date.now()) {
  const rng = mulberry32(seed)
  const acts = []
  for (let i = 0; i < totalActs; i++) {
    acts.push(generateAct(i + 1, rng))
  }
  return { acts, seed }
}

function generateAct(index, rng) {
  const filteredSongs = applyActDifficultyConstraints(index, catalog)
  const poolSize = pickPoolSize(index, filteredSongs.length, rng)
  const rows = []

  for (let row = 0; row < rowsPerAct; row++) {
    let maxAllowed = maxNodesPerRow
    if (row > 0) {
      maxAllowed = Math.min(maxNodesPerRow, rows[row - 1].length * 2)
      if (maxAllowed < minNodesPerRow) {
        maxAllowed = Math.max(1, maxAllowed)
      }
    }
    let count = minNodesPerRow + rngInt(rng, maxNodesPerRow - minNodesPerRow + 1)
    count = Math.min(count, maxAllowed)
    if (count < 1) count = 1
    if (row === rowsPerAct - 1) {
      count = 1 // boss
    }

    const nodes = []
    for (let col = 0; col < count; col++) {
      const isBoss = row === rowsPerAct - 1
      nodes.push({
        col,
        kind: isBoss ? nodeKinds.boss : nodeKinds.challenge,
        challenge: isBoss ? bossChallenge() : challenge(filteredSongs, poolSize, rng),
        edges: [],
      })
    }

    if (row > 0) {
      connectRows(rows[row - 1], nodes, rng)
    }

    rows.push(nodes)
  }

  return { index, rows }
}

function connectRows(prev, next, rng) {
  if (!prev.length || !next.length) return

  const edgeSets = prev.map(() => new Set())

  // ensure every next node has an inbound edge
  next.forEach((_, nextIdx) => {
    const candidates = edgeSets
      .map((set, idx) => ({ size: set.size, idx }))
      .filter(({ size }) => size < 2)
    if (candidates.length === 0) return
    const pick = candidates[rngInt(rng, candidates.length)].idx
    edgeSets[pick].add(nextIdx)
  })

  // add extra edges
  prev.forEach((node, idx) => {
    const set = edgeSets[idx] ?? new Set()
    const remaining = Math.max(0, 2 - set.size)
    const available = Math.max(0, next.length - set.size)
    if (remaining <= 0 || available <= 0) return
    const targetCount = Math.min(remaining, available)
    const picks = pickDistinct(next.length, targetCount, rng, set)
    picks.forEach((p) => set.add(p))
    edgeSets[idx] = set
  })

  // finalize edges with a max of 2 unique targets
  edgeSets.forEach((set, idx) => {
    const limited = Array.from(set)
    prev[idx].edges = limited
  })
}

function challenge(pool, poolSize, rng) {
  const creators = [decadeChallenge, difficultyChallenge, genreChallenge, longSongChallenge]
  const shuffled = shuffle(creators, rng)
  for (const fn of shuffled) {
    const c = fn(pool, poolSize, rng)
    if (c) return c
  }
  const songs = sample(pool, poolSize, rng)
  return {
    name: 'Challenge',
    summary: `Pick any 3 of these ${songs.length} tracks.`,
    songs,
  }
}

function bossChallenge() {
  const boss = catalog.find((s) => s.title === 'Bohemian Rhapsody') ?? catalog[0]
  return {
    name: 'Boss',
    summary: 'Final showdown: Bohemian Rhapsody.',
    songs: [boss],
  }
}

function applyActDifficultyConstraints(actIndex, songs) {
  return songs.filter((s) => {
    if (actIndex === 1) return s.difficulty <= 3
    if (actIndex === 2) return s.difficulty <= 5
    return s.difficulty >= 3
  })
}

function pickPoolSize(actIndex, available, rng) {
  const bounds = poolBounds[actIndex] ?? poolBounds[3]
  const min = Math.min(bounds.min, available)
  const max = Math.min(bounds.max, available)
  if (min >= max) return min
  return min + rngInt(rng, max - min + 1)
}

function sample(pool, count, rng) {
  if (pool.length <= count) return [...pool]
  const indices = pickDistinct(pool.length, count, rng)
  return indices.map((i) => pool[i])
}

function decadeChallenge(pool, poolSize, rng) {
  const byDecade = pool.reduce((acc, s) => {
    if (!s.year) return acc
    const dec = Math.floor(s.year / 10) * 10
    acc[dec] = acc[dec] || []
    acc[dec].push(s)
    return acc
  }, {})
  const eligible = Object.entries(byDecade).filter(([, list]) => list.length >= 3)
  if (!eligible.length) return null
  const [decade, list] = eligible[rngInt(rng, eligible.length)]
  const songs = sample(list, Math.min(poolSize, list.length), rng)
  return {
    name: 'DecadeChallenge',
    summary: `Pick any 3 of these ${songs.length} tracks from the ${decade}s.`,
    songs,
  }
}

function difficultyChallenge(pool, poolSize, rng) {
  const byLevel = pool.reduce((acc, s) => {
    const level = clampDifficulty(s.difficulty)
    acc[level] = acc[level] || []
    acc[level].push(s)
    return acc
  }, {})
  const eligible = Object.entries(byLevel).filter(([, list]) => list.length >= 3)
  if (!eligible.length) return null
  const [level, list] = eligible[rngInt(rng, eligible.length)]
  const songs = sample(list, Math.min(poolSize, list.length), rng)
  return {
    name: 'DifficultyChallenge',
    summary: `Pick any 3 of these ${songs.length} difficulty ${level} tracks.`,
    songs,
  }
}

function genreChallenge(pool, poolSize, rng) {
  const byGenre = pool.reduce((acc, s) => {
    if (!s.genre) return acc
    const key = s.genre.toLowerCase()
    acc[key] = acc[key] || []
    acc[key].push(s)
    return acc
  }, {})
  const eligible = Object.entries(byGenre).filter(([, list]) => list.length >= 3)
  if (!eligible.length) return null
  const [genre, list] = eligible[rngInt(rng, eligible.length)]
  const songs = sample(list, Math.min(poolSize, list.length), rng)
  return {
    name: 'GenreChallenge',
    summary: `Pick any 3 of these ${songs.length} ${genre} tracks.`,
    songs,
  }
}

function longSongChallenge(pool, poolSize, rng) {
  const longSongs = pool.filter((s) => s.seconds > 300)
  if (longSongs.length < 3) return null
  const songs = sample(longSongs, Math.min(poolSize, longSongs.length), rng)
  return {
    name: 'SongLengthChallenge',
    summary: `Pick any 3 of these ${songs.length} long tracks (over 5 minutes).`,
    songs,
  }
}

function pickDistinct(size, count, rng, existing = new Set()) {
  const seen = new Set()
  existing.forEach((v) => seen.add(v))
  const picks = []
  let safety = 0
  const maxAttempts = size * 3
  while (picks.length < count && safety < maxAttempts) {
    const v = rngInt(rng, size)
    if (seen.has(v)) continue
    seen.add(v)
    picks.push(v)
    safety++
  }
  return picks
}

function rngInt(rng, maxExclusive) {
  return Math.floor(rng() * maxExclusive)
}

// deterministic PRNG
function mulberry32(seed) {
  let t = seed + 0x6d2b79f5
  return function () {
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(arr, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function parseSongs(csv) {
  const lines = csv.trim().split('\n')
  const header = lines.shift().split(',')
  const idx = (key) => header.indexOf(key)
  return lines
    .map((line) => {
      const cols = line.split(',')
      const clean = (str) => (str || '').replace(/^"+|"+$/g, '').replace(/""/g, '"').trim()
      return {
        id: clean(cols[idx('id')]) || `${Math.random()}`,
        title: clean(cols[idx('title')]),
        artist: clean(cols[idx('artist')]),
        album: clean(cols[idx('album')]),
        genre: clean(cols[idx('genre')]),
        difficulty: clampDifficulty(Number(cols[idx('difficulty')])),
        length: clean(cols[idx('length')]),
        year: Number(clean(cols[idx('year')])) || undefined,
        seconds: parseSeconds(clean(cols[idx('length')])),
      }
    })
    .filter((s) => s.title)
}

function parseSeconds(len) {
  if (!len) return 0
  const [m, s] = len.split(':').map(Number)
  if (Number.isNaN(m) || Number.isNaN(s)) return 0
  return m * 60 + s
}

function clampDifficulty(d) {
  if (Number.isNaN(d)) return 0
  return Math.max(0, Math.min(6, d))
}

function ensureBoss(list) {
  const exists = list.some((s) => s.title?.toLowerCase() === 'bohemian rhapsody')
  if (exists) return list
  return [
    ...list,
    {
      id: 'boss-bohemian',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      genre: 'Classic Rock',
      difficulty: 5,
      length: '5:55',
      seconds: 355,
      year: 1975,
    },
  ]
}
