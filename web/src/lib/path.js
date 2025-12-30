import songsJson from '../data/downloaded_songs.json'

const totalActs = 3
const rowsPerAct = 7
const minNodesPerRow = 2
const maxNodesPerRow = 3
const minSelectable = 1
const maxSelectable = 3
const shopCount = 2

const poolBounds = {
  1: { min: 9, max: 12 },
  2: { min: 6, max: 9 },
  3: { min: 3, max: 5 },
}

export const nodeKinds = {
  challenge: 'challenge',
  shop: 'shop',
  boss: 'boss',
}

const catalog = ensureBoss(parseSongsJson(songsJson))
export const songs = catalog
export const songOrigins = collectOrigins(catalog)

export function generateRun(seed = Date.now(), _instrument, allowedOrigins) {
  const rng = mulberry32(seed)
  const acts = []
  const filteredCatalog = filterSongsByOrigin(catalog, allowedOrigins)
  for (let i = 0; i < totalActs; i++) {
    acts.push(generateAct(i + 1, rng, filteredCatalog))
  }
  return { acts, seed }
}

function generateAct(index, rng, catalogSubset) {
  const filteredSongs = applyActDifficultyConstraints(index, catalogSubset)
  const rows = []
  const shopRows = pickShopRows(rowsPerAct, rng)

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
    if (row === rowsPerAct - 1 || shopRows.has(row)) {
      count = 1 // boss or shop is single node for clarity
    }

    const nodes = []
    for (let col = 0; col < count; col++) {
      const isBoss = row === rowsPerAct - 1
      const isShop = shopRows.has(row)
      const poolSize = pickPoolSize(index, filteredSongs.length, rng)
      const selectCount = pickSelectCount(rng)
      nodes.push({
        col,
        kind: isBoss ? nodeKinds.boss : isShop ? nodeKinds.shop : nodeKinds.challenge,
        challenge: isBoss
          ? bossChallenge(index, catalogSubset)
          : isShop
            ? null
            : challenge(filteredSongs, poolSize, selectCount, rng, index),
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

  const assignments = []
  for (let i = 0; i < prev.length; i++) {
    let target = 0
    if (prev.length > 1) {
      target = Math.round((i * (next.length - 1)) / (prev.length - 1))
    }
    if (assignments.length > 0 && target < assignments[assignments.length - 1]) {
      target = assignments[assignments.length - 1]
    }
    target = Math.min(target, next.length - 1)
    assignments.push(target)
    prev[i].edges = [target]
  }

  // optional second edges to adjacent targets without crossing
  for (let i = 0; i < prev.length; i++) {
    const currentTarget = assignments[i]
    const nextTarget = assignments[i + 1] ?? next.length - 1
    const candidate = currentTarget + 1
    if (candidate <= nextTarget && candidate < next.length && prev[i].edges.length < 2) {
      if (rng() < 0.35) {
        prev[i].edges.push(candidate)
      }
    }
  }

  // ensure every next node has inbound edge (attach to nearest without crossing)
  const incoming = Array(next.length).fill(0)
  prev.forEach((node) => node.edges.forEach((e) => incoming[e]++))
  incoming.forEach((count, idx) => {
    if (count > 0) return
    // find prev whose target range covers idx
    for (let p = 0; p < prev.length; p++) {
      const targets = prev[p].edges
      const maxTarget = Math.max(...targets)
      const minTarget = Math.min(...targets)
      if (idx >= minTarget && idx <= maxTarget && targets.length < 2) {
        targets.push(idx)
        incoming[idx]++
        return
      }
    }
    // fallback: attach to closest prev with space
    for (let p = 0; p < prev.length; p++) {
      if (prev[p].edges.length < 2) {
        prev[p].edges.push(idx)
        incoming[idx]++
        return
      }
    }
  })
}

function challenge(pool, poolSize, selectCount, rng, actIndex) {
  const creators = [
    shortSongChallenge,
    mediumSongChallenge,
    epicSongChallenge,
    longSongChallenge,
    decadeChallenge,
    difficultyChallenge,
    genreChallenge,
  ]
  const shuffled = shuffle(creators, rng)
  for (const fn of shuffled) {
    const c = fn(pool, poolSize, rng, actIndex, selectCount)
    if (c) return c
  }
  const songs = sample(pool, Math.max(selectCount, poolSize), rng)
  const finalSelect = clampSelectCount(selectCount, songs.length)
  return {
    name: 'Challenge',
    summary: summaryForSongs(songs.length, finalSelect),
    songs,
    selectCount: finalSelect,
    goal: actGoal(actIndex),
  }
}

function bossChallenge(actIndex, pool) {
  const boss = pool.find((s) => s.title === 'Bohemian Rhapsody') ?? pool[0]
  return {
    name: 'Boss',
    summary: 'Final showdown: Bohemian Rhapsody.',
    songs: [boss],
    selectCount: 1,
    goal: actGoal(actIndex),
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

function pickSelectCount(rng) {
  return minSelectable + rngInt(rng, maxSelectable - minSelectable + 1)
}

function sample(pool, count, rng) {
  if (pool.length <= count) return [...pool]
  const indices = pickDistinct(pool.length, count, rng)
  return indices.map((i) => pool[i])
}

function summaryForSongs(poolSize, selectCount, suffix = '') {
  const tail = suffix ? ` ${suffix}` : ''
  return `Pick ${selectCount} of these ${poolSize} tracks${tail}.`
}

function actGoal(actIndex) {
  if (actIndex === 1) return 3
  if (actIndex === 2) return 4
  if (actIndex === 3) return 5
  return 5
}

// exports for tests
export {
  shortSongChallenge,
  mediumSongChallenge,
  epicSongChallenge,
  genreChallenge,
  actGoal,
  pickSelectCount,
  clampSelectCount,
}

function decadeChallenge(pool, poolSize, rng, actIndex, selectCount) {
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
  const sampleSize = Math.max(selectCount, Math.min(poolSize, list.length))
  const songs = sample(list, sampleSize, rng)
  const finalSelect = clampSelectCount(selectCount, songs.length)
  return {
    name: 'DecadeChallenge',
    summary: summaryForSongs(songs.length, finalSelect, `from the ${decade}s`),
    songs,
    selectCount: finalSelect,
    goal: actGoal(actIndex),
  }
}

function difficultyChallenge(pool, poolSize, rng, actIndex, selectCount) {
  const byLevel = pool.reduce((acc, s) => {
    const level = clampDifficulty(s.difficulty)
    acc[level] = acc[level] || []
    acc[level].push(s)
    return acc
  }, {})
  const eligible = Object.entries(byLevel).filter(([, list]) => list.length >= 3)
  if (!eligible.length) return null
  const [level, list] = eligible[rngInt(rng, eligible.length)]
  const sampleSize = Math.max(selectCount, Math.min(poolSize, list.length))
  const songs = sample(list, sampleSize, rng)
  const finalSelect = clampSelectCount(selectCount, songs.length)
  return {
    name: 'DifficultyChallenge',
    summary: summaryForSongs(songs.length, finalSelect, `at difficulty ${level}`),
    songs,
    selectCount: finalSelect,
    goal: actGoal(actIndex),
  }
}

function genreChallenge(pool, poolSize, rng, actIndex, selectCount) {
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
  const sampleSize = Math.max(selectCount, Math.min(poolSize, list.length))
  const songs = sample(list, sampleSize, rng)
  const finalSelect = clampSelectCount(selectCount, songs.length)
  return {
    name: 'GenreChallenge',
    summary: summaryForSongs(songs.length, finalSelect, `in ${genre}`),
    songs,
    selectCount: finalSelect,
    goal: actGoal(actIndex),
  }
}

function longSongChallenge(pool, poolSize, rng, actIndex, selectCount) {
  const longSongs = pool.filter((s) => s.seconds > 300)
  if (longSongs.length < 3) return null
  const sampleSize = Math.max(selectCount, Math.min(poolSize, longSongs.length))
  const songs = sample(longSongs, sampleSize, rng)
  const finalSelect = clampSelectCount(selectCount, songs.length)
  return {
    name: 'SongLengthChallenge',
    summary: summaryForSongs(songs.length, finalSelect, 'over 5 minutes'),
    songs,
    selectCount: finalSelect,
    goal: actGoal(actIndex),
  }
}

function shortSongChallenge(pool, poolSize, rng, actIndex, selectCount) {
  const shorts = pool.filter((s) => s.seconds > 0 && s.seconds <= 150)
  if (shorts.length < 3) return null
  const sampleSize = Math.max(selectCount, Math.min(poolSize, shorts.length))
  const songs = sample(shorts, sampleSize, rng)
  const finalSelect = clampSelectCount(selectCount, songs.length)
  return {
    name: 'ShortSongChallenge',
    summary: summaryForSongs(songs.length, finalSelect, 'under 2:30'),
    songs,
    selectCount: finalSelect,
    goal: actGoal(actIndex),
  }
}

function mediumSongChallenge(pool, poolSize, rng, actIndex, selectCount) {
  const mediums = pool.filter((s) => s.seconds > 150 && s.seconds < 300)
  if (mediums.length < 3) return null
  const sampleSize = Math.max(selectCount, Math.min(poolSize, mediums.length))
  const songs = sample(mediums, sampleSize, rng)
  const finalSelect = clampSelectCount(selectCount, songs.length)
  return {
    name: 'MediumSongChallenge',
    summary: summaryForSongs(songs.length, finalSelect, '2:31 – 4:59'),
    songs,
    selectCount: finalSelect,
    goal: actGoal(actIndex),
  }
}

function epicSongChallenge(pool, poolSize, rng, actIndex, selectCount) {
  const epics = pool.filter((s) => s.seconds >= 420)
  if (epics.length < 3) return null
  const sampleSize = Math.max(selectCount, Math.min(poolSize, epics.length))
  const songs = sample(epics, sampleSize, rng)
  const finalSelect = clampSelectCount(selectCount, songs.length)
  return {
    name: 'EpicSongChallenge',
    summary: summaryForSongs(songs.length, finalSelect, 'over 7 minutes'),
    songs,
    selectCount: finalSelect,
    goal: actGoal(actIndex),
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

function parseSongsJson(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((raw, idx) => {
      const clean = (val) => (typeof val === 'string' ? val.trim() : val)
      const seconds = Number(raw.seconds)
      const difficulty = clampDifficulty(
        Number(raw.difficulty ?? raw.diff_band ?? raw.diff_guitar ?? 0),
      )
      return {
        id: clean(raw.id) || `song-${idx}`,
        title: clean(raw.title),
        artist: clean(raw.artist),
        album: clean(raw.album),
        genre: clean(raw.genre),
        difficulty,
        length: clean(raw.length),
        year: Number(raw.year) || undefined,
        seconds:
          seconds && !Number.isNaN(seconds) && seconds > 0
            ? seconds
            : parseSeconds(clean(raw.length)),
        origin: clean(raw.origin),
        diff_guitar: clampDifficulty(Number(raw.diff_guitar)),
        diff_bass: clampDifficulty(Number(raw.diff_bass)),
        diff_drums: clampDifficulty(Number(raw.diff_drums)),
        diff_vocals: clampDifficulty(Number(raw.diff_vocals)),
        diff_keys: clampDifficulty(Number(raw.diff_keys)),
        diff_rhythm: clampDifficulty(Number(raw.diff_rhythm)),
        source_included: raw.source_included !== false,
        supports_guitar: Boolean(raw.supports_guitar),
        supports_bass: Boolean(raw.supports_bass),
        supports_drums: Boolean(raw.supports_drums),
        supports_vocals: Boolean(raw.supports_vocals),
      }
    })
    .filter((s) => s.title && s.source_included !== false)
}

function parseSeconds(len) {
  if (!len) return 0
  if (!len.includes(':')) {
    const asNumber = Number(len)
    if (!Number.isNaN(asNumber)) return asNumber
  }
  const [m, s] = len.split(':').map(Number)
  if (Number.isNaN(m) || Number.isNaN(s)) return 0
  return m * 60 + s
}

function clampDifficulty(d) {
  if (Number.isNaN(d)) return 0
  return Math.max(0, Math.min(6, d))
}

function clampSelectCount(count, songsLength) {
  return Math.max(1, Math.min(count, songsLength))
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

function collectOrigins(list) {
  return Array.from(new Set(list.map((s) => s.origin).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  )
}

export function filterSongsByOrigin(list, allowedOrigins) {
  const base = list.filter((s) => s.source_included !== false)
  if (!allowedOrigins || !allowedOrigins.length) return ensureBoss(base)
  const allowed = new Set(allowedOrigins)
  const filtered = base.filter((s) => !s.origin || allowed.has(s.origin))
  if (!filtered.length) return ensureBoss(base)
  return ensureBoss(filtered)
}

function pickShopRows(totalRows, rng) {
  const shops = new Set()
  const candidateRows = []
  for (let r = 1; r < totalRows - 1; r++) {
    candidateRows.push(r)
  }
  const maxAttempts = 50
  let attempts = 0
  while (shops.size < shopCount && attempts < maxAttempts) {
    const row = candidateRows[rngInt(rng, candidateRows.length)]
    if (shops.has(row) || shops.has(row - 1) || shops.has(row + 1)) {
      attempts++
      continue
    }
    shops.add(row)
  }
  for (let i = 0; shops.size < shopCount && i < candidateRows.length; i++) {
    const r = candidateRows[i]
    if (shops.has(r) || shops.has(r - 1) || shops.has(r + 1)) continue
    shops.add(r)
  }
  return shops
}
