import './App.css'
import { generateRun } from './lib/path'
import { useEffect, useMemo, useState } from 'react'

const rowSpacing = 70
const colSpacing = 80
const nodeSize = 32
const maxSelectableSongs = 3

function App() {
  const { acts, seed } = useMemo(() => generateRun(Date.now()), [])
  const [currentAct, setCurrentAct] = useState(0)
  const [selected, setSelected] = useState({ act: 0, row: 0, col: 0 })
  const [phase, setPhase] = useState('idle') // idle | selecting | entering | done
  const [currentRow, setCurrentRow] = useState(0)
  const [choices, setChoices] = useState({})
  const [selectedSongs, setSelectedSongs] = useState([])
  const [starEntries, setStarEntries] = useState([])
  const [results, setResults] = useState({})

  useEffect(() => {
    setSelected({ act: currentAct, row: 0, col: 0 })
    setPhase('idle')
    setSelectedSongs([])
    setStarEntries([])
    setCurrentRow(0)
  }, [currentAct])

  const current = acts[currentAct]
  const selectedNode =
    current?.rows[selected.row]?.find((n) => n.col === selected.col) ?? current?.rows[0]?.[0]

  return (
    <main className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Long Way To The Top</p>
          <h1>Rhythm roguelike — React prototype</h1>
          <p className="lede">
            Hello! This is the starting point for the web client. We&apos;ll add sector maps,
            challenge selection, and rhythm hooks here.
          </p>
        </div>
        <div className="seed">Seed: {seed}</div>
      </header>

      <div className="layout">
        <div className="pane left">
          <div className="controls">
            <button
              onClick={() => changeAct(Math.max(0, currentAct - 1))}
              disabled={currentAct === 0}
            >
              Prev Act
            </button>
            <span>
              Act {currentAct + 1} / {acts.length}
            </span>
            <button
              onClick={() => changeAct(Math.min(acts.length - 1, currentAct + 1))}
              disabled={currentAct === acts.length - 1}
            >
              Next Act
            </button>
          </div>

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
              <div className="actions">
                {phase === 'idle' && (
                  <button
                    onClick={startChallenge}
                    disabled={
                      !isReachable(selected, choices, current, currentRow, currentAct) ||
                      selected.row !== currentRow
                    }
                  >
                    Start challenge
                  </button>
                )}
                {phase === 'done' && currentRow < current.rows.length - 1 && (
                  <button onClick={advanceRow}>Advance</button>
                )}
              </div>

              {phase !== 'idle' && selectedNode.challenge?.songs && (
                <>
                  <p className="eyebrow">Songs</p>
                  <ul>
                    {selectedNode.challenge.songs.map((s, idx) => (
                      <li key={`${s.id}-${s.title}`}>
                        <label className="song-row">
                          {phase === 'selecting' && (
                            <input
                              type="checkbox"
                              checked={selectedSongs.some((sel) => sel.id === s.id)}
                              onChange={() => toggleSongSelection(s)}
                              disabled={
                                !selectedSongs.some((sel) => sel.id === s.id) &&
                                selectedSongs.length >= maxSelectableSongs
                              }
                            />
                          )}
                          <div>
                            <strong>{s.title}</strong> — {s.artist}{' '}
                            {s.year ? <span className="meta">({s.year})</span> : null}
                            {s.genre ? <span className="meta"> • {s.genre}</span> : null}
                            {s.length ? <span className="meta"> • {s.length}</span> : null}
                            {s.difficulty ? (
                              <span className="meta"> • diff {s.difficulty}/6</span>
                            ) : null}
                          </div>
                        </label>
                        {phase === 'entering' && selectedSongs.find((sel) => sel.id === s.id) ? (
                          <input
                            className="star-input"
                            type="number"
                            min="0"
                            max="6"
                            value={starEntries[selectedSongs.findIndex((sel) => sel.id === s.id)] ?? ''}
                            onChange={(e) =>
                              updateStarEntry(
                                selectedSongs.findIndex((sel) => sel.id === s.id),
                                e.target.value,
                              )
                            }
                          />
                        ) : null}
                        {phase === 'done' &&
                        resultsKey(selected.act, selected.row) in results &&
                        selectedSongs.find((sel) => sel.id === s.id) ? (
                          <span className="meta">
                            Stars:{' '}
                            {
                              results[resultsKey(selected.act, selected.row)].stars[
                                selectedSongs.findIndex((sel) => sel.id === s.id)
                              ]
                            }
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {phase === 'selecting' && (
                    <button
                      onClick={() => setPhase('entering')}
                      disabled={selectedSongs.length === 0}
                    >
                      Enter stars
                    </button>
                  )}
                  {phase === 'entering' && (
                    <button onClick={submitStars} disabled={!starsComplete()}>
                      Submit results
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="lede">Select a node to see details.</p>
          )}
        </aside>
      </div>
    </main>
  )
  function changeAct(next) {
    setCurrentAct(next)
    setSelected({ act: next, row: 0, col: 0 })
    setPhase('idle')
    setCurrentRow(0)
    setSelectedSongs([])
    setStarEntries([])
  }

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
        songs: selectedSongs,
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

export default App
