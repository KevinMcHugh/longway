import './App.css'
import { generateRun } from './lib/path'
import { useEffect, useMemo, useRef, useState } from 'react'

const rowSpacing = 70
const colSpacing = 80
const nodeSize = 32
const maxSelectableSongs = 3
const maxStars = 6
const STORAGE_KEY = 'longway-save-v1'

function App() {
  const savedState = useMemo(() => readSavedState(), [])
  const initialSeed = savedState?.seed ?? Date.now()
  const { acts, seed } = useMemo(() => generateRun(initialSeed), [initialSeed])
  const [currentAct, setCurrentAct] = useState(savedState?.currentAct ?? 0)
  const [selected, setSelected] = useState(
    clampSelection(savedState?.selected ?? { act: 0, row: 0, col: 0 }, acts),
  )
  const [phase, setPhase] = useState(savedState?.phase ?? 'idle') // idle | selecting | entering | done
  const [currentRow, setCurrentRow] = useState(
    clampRow(savedState?.currentRow ?? 0, acts, savedState?.currentAct ?? 0),
  )
  const [choices, setChoices] = useState(savedState?.choices ?? {})
  const [selectedSongs, setSelectedSongs] = useState(() =>
    restoreSelectedSongs(savedState?.selectedSongIds, acts, savedState?.selected),
  )
  const [starEntries, setStarEntries] = useState(savedState?.starEntries ?? [])
  const [results, setResults] = useState(() => restoreResults(savedState?.results))
  const hydrated = useRef(false)
  const [loadedFromStorage] = useState(Boolean(savedState))
  const [lastSaved, setLastSaved] = useState(savedState?.lastSaved ?? null)

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    setSelected({ act: currentAct, row: 0, col: 0 })
    setPhase('idle')
    setSelectedSongs([])
    setStarEntries([])
    setCurrentRow(0)
  }, [currentAct])

  useEffect(() => {
    const now = Date.now()
    persistState({
      seed,
      currentAct,
      selected,
      phase,
      currentRow,
      choices,
      selectedSongIds: selectedSongs.map((s) => s.id),
      starEntries,
      results: serializeResults(results),
      lastSaved: now,
    })
    setLastSaved(now)
  }, [seed, currentAct, selected, phase, currentRow, choices, selectedSongs, starEntries, results])

  const current = acts[currentAct]
  const selectedNode =
    current?.rows[selected.row]?.find((n) => n.col === selected.col) ?? current?.rows[0]?.[0]
  const startEnabled =
    isReachable(selected, choices, current, currentRow, currentAct) && selected.row === currentRow
  const canAdvanceRow = phase === 'done' && currentRow < current.rows.length - 1
  const canAdvanceAct = phase === 'done' && currentRow === current.rows.length - 1 && currentAct < acts.length - 1
  const action = actionForState({
    phase,
    hasSelection: selectedSongs.length > 0,
    starsComplete: starsComplete(),
    canAdvanceRow,
    canAdvanceAct,
    startEnabled,
  })

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>A Long Way To The Top</h1>
        </div>
        <div className="seed">
          <div>Seed: {seed}</div>
          <div className="autosave">
            Autosave: {loadedFromStorage ? 'resumed' : 'new run'}
            {lastSaved ? ` • saved ${new Date(lastSaved).toLocaleTimeString()}` : ''}
          </div>
        </div>
      </header>

      <div className="layout">
        <div className="pane left">
          <section className="acts">
            <ActView
              act={current}
              onSelect={(row, col) => handleSelectNode(row, col)}
              selected={selected}
              reachable={{
                row: currentRow,
                cols: reachableCols(current, currentRow, choices, currentAct),
              }}
            />
          </section>
        </div>
        <aside className="pane right">
          {selectedNode ? (
            <div className="details">
              <p className="eyebrow">Challenge</p>
              <h3>{selectedNode.challenge?.name ?? 'Unknown'}</h3>
              <p className="lede">{selectedNode.challenge?.summary}</p>

              {phase !== 'idle' && selectedNode.challenge?.songs && (
                <>
                  <p className="eyebrow">Songs</p>
                  <ul>
                    {(phase === 'selecting' ? selectedNode.challenge.songs : selectedSongs).map((s) => {
                      const selectedIdx = selectedSongs.findIndex((sel) => sel.id === s.id)
                      const isSelected = selectedIdx !== -1
                      const toggleAllowed = isSongToggleAllowed(
                        phase,
                        isSelected,
                        selectedSongs.length,
                        maxSelectableSongs,
                      )
                      return (
                        <li key={`${s.id}-${s.title}`}>
                          <button
                            type="button"
                            className={`song-row ${isSelected ? 'song-row-selected' : ''}`}
                            onClick={toggleAllowed ? () => toggleSongSelection(s) : undefined}
                            disabled={!toggleAllowed}
                          >
                            {phase === 'selecting' && (
                              <span className="checkbox">{isSelected ? '✓' : ''}</span>
                            )}
                            <div className="song-info">
                              <div className="song-main">
                                <span>
                                  <strong>{s.title}</strong> — {s.artist}{' '}
                                  {s.year ? <span className="meta">({s.year})</span> : null}
                                </span>
                                <span className="song-meta">
                                  {s.genre ? <span className="meta">{s.genre}</span> : null}
                                  {s.length ? <span className="meta"> • {s.length}</span> : null}
                                  {s.difficulty ? (
                                    <span className="meta"> • {renderDifficulty(s.difficulty)}</span>
                                  ) : null}
                                </span>
                              </div>
                            </div>
                          </button>
                          {phase === 'entering' && isSelected ? (
                            <StarPicker
                              value={starEntries[selectedIdx]}
                              onChange={(val) => updateStarEntry(selectedIdx, val)}
                              max={maxStars}
                            />
                          ) : null}
                          {phase === 'done' &&
                          resultsKey(selected.act, selected.row) in results &&
                          isSelected ? (
                            <span className="meta">
                              {renderStars(
                                results[resultsKey(selected.act, selected.row)].stars[selectedIdx],
                              )}
                            </span>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </div>
          ) : (
            <p className="lede">Select a node to see details.</p>
          )}
          <div className="actions-bar">
            {action ? (
              <button
                className="primary"
                onClick={() => {
                  switch (action.kind) {
                    case 'start':
                      startChallenge()
                      break
                    case 'enter':
                      setPhase('entering')
                      break
                    case 'submit':
                      submitStars()
                      break
                    case 'advance':
                      advanceRow()
                      break
                    case 'nextAct':
                      advanceAct()
                      break
                    default:
                      break
                  }
                }}
                disabled={action.disabled}
              >
                {action.label}
              </button>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  )
  function isReachable(sel, choiceMap, actData, row, actIndex) {
    if (sel.row !== row) return false
    const cols = reachableCols(actData, row, choiceMap, actIndex)
    return cols.includes(sel.col)
  }

  function handleSelectNode(row, col) {
    if (!isReachable({ act: currentAct, row, col }, choices, current, currentRow, currentAct)) return
    if (phase !== 'idle') return
    setSelected({ act: currentAct, row, col })
  }

  function startChallenge() {
    setChoices((prev) => ({
      ...prev,
      [currentAct]: { ...(prev[currentAct] || {}), [selected.row]: selected.col },
    }))
    setPhase('selecting')
    setSelectedSongs([])
    setStarEntries([])
  }

  function toggleSongSelection(song) {
    setSelectedSongs((prev) => {
      const exists = prev.find((s) => s.id === song.id)
      if (exists) {
        return prev.filter((s) => s.id !== song.id)
      }
      if (prev.length >= maxSelectableSongs) return prev
      return [...prev, song]
    })
  }

  function updateStarEntry(idx, value) {
    const parsed = Math.max(0, Math.min(6, Number(value)))
    setStarEntries((prev) => {
      const next = [...prev]
      next[idx] = Number.isNaN(parsed) ? '' : parsed
      return next
    })
  }

  function starsComplete() {
    return selectedSongs.length > 0 && selectedSongs.every((_, idx) => starEntries[idx] !== undefined && starEntries[idx] !== '')
  }

  function submitStars() {
    if (!starsComplete()) return
    const key = resultsKey(currentAct, selected.row)
    setResults((prev) => ({
      ...prev,
      [key]: {
        stars: starEntries.map((v) => Number(v)),
      },
    }))
    setPhase('done')
  }

  function advanceRow() {
    const nextRow = currentRow + 1
    if (nextRow >= current.rows.length) return
    const prevChoice = choices[currentAct]?.[currentRow] ?? selected.col
    const edges = current.rows[currentRow][prevChoice]?.edges || []
    const nextCol = edges[0] ?? 0
    setCurrentRow(nextRow)
    setSelected({ act: currentAct, row: nextRow, col: nextCol })
    setPhase('idle')
    setSelectedSongs([])
    setStarEntries([])
  }

  function advanceAct() {
    if (currentAct >= acts.length - 1) return
    setCurrentAct((prev) => Math.min(prev + 1, acts.length - 1))
  }
}

function resultsKey(act, row) {
  return `${act}-${row}`
}

function reachableCols(act, row, choices, actIndex) {
  if (!act) return []
  if (row === 0) return act.rows[0].map((n) => n.col)
  const prevChoice = choices[actIndex]?.[row - 1] ?? 0
  const prevRow = act.rows[row - 1] || []
  const node = prevRow.find((n) => n.col === prevChoice) || prevRow[0]
  return node?.edges || []
}

function ActView({ act, selected, onSelect, reachable }) {
  const rows = act.rows
  const maxCols = Math.max(...rows.map((r) => r.length))
  const width = maxCols * colSpacing + nodeSize
  const height = rows.length * rowSpacing + nodeSize

  return (
    <div className="act">
      <h2>Act {act.index}</h2>
      <div className="grid" style={{ height, width }}>
        {rows.map((row, rowIdx) => (
          <RowView
            key={`r-${rowIdx}`}
            row={row}
            rowIdx={rowIdx}
            rows={rows}
            onSelect={onSelect}
            selected={selected}
            reachable={reachable}
          />
        ))}
      </div>
    </div>
  )
}

function RowView({ row, rowIdx, rows, onSelect, selected, reachable }) {
  const y = (rows.length - 1 - rowIdx) * rowSpacing
  const nextRow = rows[rowIdx + 1]
  const allowed =
    reachable && reachable.row === rowIdx ? reachable.cols || [] : []
  return (
    <>
      {row.map((node) => (
        <NodeView
          key={`n-${rowIdx}-${node.col}`}
          node={node}
          x={node.col * colSpacing}
          y={y}
          row={rowIdx}
          selected={selected?.row === rowIdx && selected?.col === node.col}
          reachable={allowed.includes(node.col)}
          onSelect={() => onSelect(rowIdx, node.col)}
        />
      ))}
      {nextRow &&
        row.flatMap((node) =>
          (node.edges || []).map((target) => {
            const startX = node.col * colSpacing + nodeSize / 2
            const startY = y + nodeSize / 2
            const targetNode = nextRow[target]
            if (!targetNode) return null
            const endX = targetNode.col * colSpacing + nodeSize / 2
            const endY = y - rowSpacing + nodeSize / 2
            const dx = endX - startX
            const dy = endY - startY
            const angle = Math.atan2(dy, dx) * (180 / Math.PI)
            const length = Math.sqrt(dx * dx + dy * dy)
            return (
              <div
                key={`edge-${node.col}-${target}`}
                className="edge"
                style={{
                  width: `${length}px`,
                  transform: `translate(${startX}px, ${startY}px) rotate(${angle}deg)`,
                }}
              />
            )
          }),
        )}
    </>
  )
}

function NodeView({ node, x, y, selected, reachable, onSelect }) {
  return (
    <div
      className="node-wrapper"
      style={{ left: x, top: y }}
      onClick={reachable ? onSelect : undefined}
    >
      <div
        className={`node node-${node.kind} ${selected ? 'node-selected' : ''} ${
          reachable ? 'node-reachable' : 'node-disabled'
        }`}
      >
        {node.kind === 'boss' ? 'B' : 'C'}
      </div>
    </div>
  )
}

function StarPicker({ value, onChange, max }) {
  return (
    <div className="stars">
      {Array.from({ length: max + 1 }).map((_, idx) => (
        <button
          key={idx}
          className={`star ${value === idx ? 'star-active' : ''}`}
          onClick={() => onChange(idx)}
          type="button"
        >
          {idx}
        </button>
      ))}
    </div>
  )
}

export default App

export function isSongToggleAllowed(phase, isSelected, selectedCount, maxSelectable) {
  if (phase !== 'selecting') return false
  if (isSelected) return true
  return selectedCount < maxSelectable
}

export function renderDifficulty(level) {
  const clamped = Math.max(0, Math.min(6, Math.round(level)))
  if (clamped >= 6) return '🔥'
  if (clamped <= 0) return '•'
  return '🔴'.repeat(clamped)
}

export function renderStars(count) {
  const clamped = Math.max(0, Math.min(maxStars, Math.round(count || 0)))
  if (clamped === 0) return '—'
  return '⭐️'.repeat(clamped)
}

export function actionForState({
  phase,
  hasSelection,
  starsComplete,
  canAdvanceRow,
  canAdvanceAct,
  startEnabled,
}) {
  if (phase === 'idle') {
    return { kind: 'start', label: 'Start challenge', disabled: !startEnabled }
  }
  if (phase === 'selecting') {
    return { kind: 'enter', label: 'Enter stars', disabled: !hasSelection }
  }
  if (phase === 'entering') {
    return { kind: 'submit', label: 'Submit results', disabled: !starsComplete }
  }
  if (phase === 'done' && canAdvanceAct) {
    return { kind: 'nextAct', label: 'Next act', disabled: false }
  }
  if (phase === 'done' && canAdvanceRow) {
    return { kind: 'advance', label: 'Advance', disabled: false }
  }
  return null
}

export function persistState(state) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (_) {
    // ignore storage errors
  }
}

export function readSavedState() {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (_) {
    return null
  }
}

export function clampSelection(sel, acts) {
  const actIndex = Math.min(Math.max(0, sel?.act ?? 0), acts.length - 1)
  const act = acts[actIndex]
  const rows = act?.rows ?? []
  const rowIndex = Math.min(Math.max(0, sel?.row ?? 0), rows.length - 1)
  const row = rows[rowIndex] || []
  const colValue =
    row.find((n) => n.col === (sel?.col ?? 0))?.col ?? (row[0]?.col ?? 0)
  return { act: actIndex, row: rowIndex, col: colValue }
}

export function clampRow(row, acts, actIndex) {
  const act = acts[Math.min(Math.max(0, actIndex), acts.length - 1)]
  if (!act) return 0
  return Math.min(Math.max(0, row), act.rows.length - 1)
}

export function restoreSelectedSongs(ids, acts, selected) {
  if (!ids || !Array.isArray(ids) || !selected) return []
  const act = acts[selected.act]
  const row = act?.rows?.[selected.row]
  const node = row?.find((n) => n.col === selected.col)
  const songs = node?.challenge?.songs || []
  const byId = new Map(songs.map((s) => [s.id, s]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
}

export function serializeResults(results) {
  if (!results) return {}
  const out = {}
  Object.entries(results).forEach(([key, value]) => {
    out[key] = { stars: value.stars }
  })
  return out
}

export function restoreResults(saved) {
  if (!saved || typeof saved !== 'object') return {}
  const out = {}
  Object.entries(saved).forEach(([key, value]) => {
    out[key] = { stars: value?.stars ?? [] }
  })
  return out
}
