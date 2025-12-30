import './App.css'
import { generateRun, nodeKinds, songOrigins, originGroups } from './lib/path'
import { useEffect, useMemo, useRef, useState } from 'react'

const rowSpacing = 70
const colSpacing = 80
const nodeSize = 32
const maxStars = 6
const startingVoltage = 10000
const voltagePenaltyPerMissingStar = 1000
const lowVoltageThreshold = 3000
const STORAGE_KEY = 'longway-save-v1'
const gearSlots = [ 'Shirt', 'Pants', 'Instrument', 'Amplifier' ]
const instruments = [
  { value: 'band', label: 'Band' },
  { value: 'guitar', label: 'Guitar' },
  { value: 'bass', label: 'Bass' },
  { value: 'drums', label: 'Drums' },
  { value: 'vocals', label: 'Vocals' },
  { value: 'keys', label: 'Keys' },
  { value: 'rhythm', label: 'Rhythm' },
]
const gearOptions = {
  Shirt: [
    { id: 'shirt-cheap', name: 'Cheap Shirt', quality: 'cheap', rarity: 'common', slot: 'Shirt' },
    { id: 'shirt-fancy', name: 'Fancy Shirt', quality: 'fancy', rarity: 'uncommon', slot: 'Shirt' },
  ],
  Pants: [
    { id: 'pants-cheap', name: 'Cheap Pants', quality: 'cheap', rarity: 'common', slot: 'Pants' },
    { id: 'pants-fancy', name: 'Fancy Pants', quality: 'fancy', rarity: 'uncommon', slot: 'Pants' },
  ],
  Instrument: [
    { id: 'instrument-cheap', name: 'Cheap Instrument', quality: 'cheap', rarity: 'common', slot: 'Instrument' },
    { id: 'instrument-fancy', name: 'Fancy Instrument', quality: 'fancy', rarity: 'uncommon', slot: 'Instrument' },
  ],
  Amplifier: [
    { id: 'amp-cheap', name: 'Cheap Amplifier', quality: 'cheap', rarity: 'common', slot: 'Amplifier' },
    { id: 'amp-fancy', name: 'Fancy Amplifier', quality: 'fancy', rarity: 'uncommon', slot: 'Amplifier' },
  ],
}

function App() {
  const savedState = useMemo(() => readSavedState(), [])
  const initialSeed = savedState?.seed ?? Date.now()
  const [ seed, setSeed ] = useState(initialSeed)
  const [ instrument, setInstrument ] = useState(savedState?.instrument ?? 'band')
  const [ selectedOrigins, setSelectedOrigins ] = useState(
    savedState?.selectedOrigins?.length ? savedState.selectedOrigins : songOrigins,
  )
  const { acts } = useMemo(
    () => generateRun(seed, instrument, selectedOrigins),
    [ seed, instrument, selectedOrigins ],
  )
  const [ currentAct, setCurrentAct ] = useState(savedState?.currentAct ?? 0)
  const [ selected, setSelected ] = useState(
    clampSelection(savedState?.selected ?? { act: 0, row: 0, col: 0 }, acts),
  )
  const [ phase, setPhase ] = useState(savedState?.phase ?? 'idle') // idle | selecting | entering | done
  const [ currentRow, setCurrentRow ] = useState(
    clampRow(savedState?.currentRow ?? 0, acts, savedState?.currentAct ?? 0),
  )
  const [ choices, setChoices ] = useState(savedState?.choices ?? {})
  const [ selectedSongs, setSelectedSongs ] = useState(() =>
    restoreSelectedSongs(savedState?.selectedSongIds, acts, savedState?.selected),
  )
  const [ starEntries, setStarEntries ] = useState(savedState?.starEntries ?? [])
  const [ results, setResults ] = useState(() => restoreResults(savedState?.results))
  const [ gear, setGear ] = useState(savedState?.gear ?? defaultGear())
  const [ voltage, setVoltage ] = useState(savedState?.voltage ?? startingVoltage)
  const hydrated = useRef(false)
  const prevAct = useRef(currentAct)
  const [ loadedFromStorage ] = useState(Boolean(savedState))
  const [ lastSaved, setLastSaved ] = useState(savedState?.lastSaved ?? null)
  const [ gameOver, setGameOver ] = useState(false)
  const [ newGameOpen, setNewGameOpen ] = useState(false)
  const [ pendingInstrument, setPendingInstrument ] = useState(instrument)
  const [ pendingSeed, setPendingSeed ] = useState('')
  const [ pendingOrigins, setPendingOrigins ] = useState(selectedOrigins)
  const [ shopOffers, setShopOffers ] = useState(
    savedState?.shopOffers ?? generateShopOffers(acts, seed),
  )

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      prevAct.current = currentAct
      return
    }
    if (prevAct.current !== currentAct) {
      prevAct.current = currentAct
      setSelected({ act: currentAct, row: 0, col: 0 })
      setPhase('idle')
      setSelectedSongs([])
      setStarEntries([])
      setCurrentRow(0)
    }
  }, [ currentAct ])

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
      gameOver,
      instrument,
      gear,
      shopOffers,
      voltage,
      selectedOrigins,
    })
    setLastSaved(now)
  }, [
    seed,
    currentAct,
    selected,
    phase,
    currentRow,
    choices,
    selectedSongs,
    starEntries,
    results,
    gameOver,
    instrument,
    gear,
    shopOffers,
    voltage,
    selectedOrigins,
  ])

  const current = acts[ currentAct ]
  const selectedNode =
    current?.rows[ selected.row ]?.find((n) => n.col === selected.col) ?? current?.rows[ 0 ]?.[ 0 ]
  const startEnabled =
    isReachable(selected, choices, current, currentRow, currentAct) && selected.row === currentRow
  const canAdvanceRow = phase === 'done' && currentRow < current.rows.length - 1
  const canAdvanceAct = phase === 'done' && currentRow === current.rows.length - 1 && currentAct < acts.length - 1
  const selectTarget = selectedNode?.challenge?.selectCount ?? 1
  const readyToEnter = selectedSongs.length === selectTarget
  const shopInventory = shopOffers[ resultsKey(selected.act, selected.row) ]
  const action =
    gameOver && selectedNode?.kind !== 'boss'
      ? null
      : selectedNode?.kind === 'shop'
        ? { kind: 'advance', label: 'Leave shop', disabled: !startEnabled }
        : actionForState({
          phase,
          hasSelection: selectedSongs.length > 0,
          canEnter: readyToEnter,
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
        <div className="toolbar">
          <div className="act-label">Act {current?.index ?? 1}</div>
          <div className="voltage-meter">
            <p className="eyebrow">Voltage</p>
            <div className={`voltage-value ${voltage <= lowVoltageThreshold ? 'voltage-low' : ''}`}>
              {voltage.toLocaleString()} V
            </div>
          </div>
          <div className="seed">
            <div>Seed: {seed}</div>
            <div className="autosave">
              Autosave: {loadedFromStorage ? 'resumed' : 'new run'}
              {lastSaved ? ` • saved ${new Date(lastSaved).toLocaleTimeString()}` : ''}
            </div>
          </div>
          <div className="options">
            <button className="ghost" type="button" onClick={() => openNewGame()}>
              New game
            </button>
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
          <section className="gear">
            <p className="eyebrow">Gear</p>
            <ul className="gear-grid">
              {gearSlots.map((slot) => (
                <li key={slot} className="gear-tile">
                  <div className="gear-slot">{slot}</div>
                  <div className="gear-name">{gear[ slot ]?.name ?? 'None'}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="pane right">
          {selectedNode ? (
            <div className="details">
              <p className="eyebrow">Challenge</p>
              <h3>
                {selectedNode.kind === 'shop'
                  ? 'Gear Shop'
                  : selectedNode.challenge?.name ?? 'Unknown'}
              </h3>
              <p className="lede">
                {selectedNode.kind === 'shop'
                  ? 'Restock and upgrade (coming soon).'
                  : selectedNode.challenge?.summary}
              </p>
              {selectedNode.kind !== 'shop' && selectedNode.challenge?.goal ? (
                <p className="goal">Goal: average {renderStars(selectedNode.challenge.goal)}</p>
              ) : null}

              {selectedNode.kind === 'shop' ? (
                <>
                  <p className="eyebrow">Loadout</p>
                  {shopInventory ? (
                    <div className="shop-grid">
                      {shopInventory.map((item) => {
                        const equipped = gear[ item.slot ]?.id === item.id
                        return (
                          <div key={item.id} className="shop-slot">
                            <p className="meta">
                              {item.slot} • {item.rarity}
                            </p>
                            <button
                              className={`shop-item ${equipped ? 'shop-item-active' : ''}`}
                              onClick={() => equipGear(item.slot, item)}
                              type="button"
                            >
                              {item.name}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="meta">No shop inventory.</p>
                  )}
                </>
              ) : null}

              {selectedNode.kind !== 'shop' && phase !== 'idle' && selectedNode.challenge?.songs && (
                <>
                  <p className="eyebrow">Songs</p>
                  <ul>
                    {(phase === 'selecting' ? selectedNode.challenge.songs : selectedSongs).map((s) => {
                      const selectedIdx = selectedSongs.findIndex((sel) => sel.id === s.id)
                      const isSelected = selectedIdx !== -1
                      const toggleAllowed =
                        phase === 'selecting' &&
                        isSongToggleAllowed({
                          phase,
                          isSelected,
                          selectedCount: selectedSongs.length,
                          minSelectable: selectTarget,
                          maxSelectable: selectTarget,
                        })
                      return (
                        <li key={`${s.id}-${s.title}`}>
                          <button
                            type="button"
                            className={`song-row ${phase === 'selecting' && isSelected ? 'song-row-selected' : ''
                              }`}
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
                                  {s.origin ? <span className="meta">{s.origin}</span> : null}
                                  {s.genre ? <span className="meta"> • {s.genre}</span> : null}
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
                              value={starEntries[ selectedIdx ]}
                              onChange={(val) => updateStarEntry(selectedIdx, val)}
                              max={maxStars}
                            />
                          ) : null}
                          {phase === 'done' &&
                            resultsKey(selected.act, selected.row) in results &&
                            isSelected ? (
                            <span className="meta">
                              {renderStars(
                                results[ resultsKey(selected.act, selected.row) ].stars[ selectedIdx ],
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
          {gameOver ? (
            <div className="gameover">
              <div className="gameover-card">
                <h4>Game Over</h4>
                <p>You missed the goal. Start a new run to try again.</p>
                <button className="primary" type="button" onClick={openNewGame}>
                  New game
                </button>
              </div>
            </div>
          ) : null}
          {newGameOpen ? (
            <div className="gameover">
              <div className="gameover-card">
                <h4>New Game</h4>
                <div className="form-row">
                  <label className="select-label">
                    Instrument
                    <select
                      value={pendingInstrument}
                      onChange={(e) => setPendingInstrument(e.target.value)}
                    >
                      {instruments.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="form-row">
                  <label className="select-label">
                    Seed (optional)
                    <input
                      type="text"
                      value={pendingSeed}
                      onChange={(e) => setPendingSeed(e.target.value)}
                    />
                  </label>
                </div>
                <div className="dialog-actions">
                  <button className="ghost" type="button" onClick={() => setNewGameOpen(false)}>
                    Cancel
                  </button>
                  <button className="primary" type="button" onClick={confirmNewGame}>
                    Start
                  </button>
                </div>
                <div className="form-row">
                  <p className="select-label">Song origins</p>
                  <div className="origin-controls">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setPendingOrigins(songOrigins)}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        if (pendingOrigins.length === 1) return
                        setPendingOrigins((prev) => (prev.length ? [] : [ ...songOrigins ]))
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  <details className="origin-collapsible" open>
                    <summary className="origin-summary">Origins ({pendingOrigins.length})</summary>
                    <div className="origin-groups">
                      {originGroups.map((group) => {
                        const allSelected = group.origins.every((o) => pendingOrigins.includes(o))
                        const someSelected =
                          !allSelected && group.origins.some((o) => pendingOrigins.includes(o))
                        return (
                          <details key={group.series} className="origin-group" open>
                            <summary className="origin-series">
                              <span className="collapse-icon" aria-hidden="true">▾</span>
                              <label className="checkbox-row origin-series-row">
                                <input
                                  type="checkbox"
                                  checked={allSelected}
                                  ref={(el) => {
                                    if (el) el.indeterminate = someSelected
                                  }}
                                  onChange={() => toggleSeries(group.origins, allSelected)}
                                />
                                <span>{group.series}</span>
                              </label>
                            </summary>
                            <div className="origin-list">
                              {group.origins.map((origin) => {
                                const checked = pendingOrigins.includes(origin)
                                return (
                                  <label key={origin} className="checkbox-row">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => togglePendingOrigin(origin)}
                                    />
                                    <span>{origin}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </details>
                        )
                      })}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          ) : null}
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
      [ currentAct ]: { ...(prev[ currentAct ] || {}), [ selected.row ]: selected.col },
    }))
    setPhase('selecting')
    setSelectedSongs([])
    setStarEntries([])
  }

  function toggleSongSelection(song) {
    setSelectedSongs((prev) =>
      toggleSong(prev, song, { minSelectable: selectTarget, maxSelectable: selectTarget }),
    )
  }

  function updateStarEntry(idx, value) {
    const parsed = Math.max(0, Math.min(6, Number(value)))
    setStarEntries((prev) => {
      const next = [ ...prev ]
      next[ idx ] = Number.isNaN(parsed) ? '' : parsed
      return next
    })
  }

  function starsComplete() {
    return (
      selectedSongs.length === selectTarget &&
      selectedSongs.every((_, idx) => starEntries[ idx ] !== undefined && starEntries[ idx ] !== '')
    )
  }

  function submitStars() {
    if (!starsComplete()) return
    const key = resultsKey(currentAct, selected.row)
    const { remaining: nextVoltage } = applyVoltageLoss(voltage, starEntries, {
      max: maxStars,
      penaltyPerMissingStar: voltagePenaltyPerMissingStar,
      goal: selectedNode?.challenge?.goal,
    })
    setVoltage(nextVoltage)
    setResults((prev) => ({
      ...prev,
      [ key ]: {
        stars: starEntries.map((v) => Number(v)),
      },
    }))
    setPhase('done')
  }

  function advanceRow() {
    const nextRow = currentRow + 1
    if (nextRow >= current.rows.length) return
    const prevChoice = choices[ currentAct ]?.[ currentRow ] ?? selected.col
    const edges = current.rows[ currentRow ][ prevChoice ]?.edges || []
    const nextCol = edges[ 0 ] ?? 0
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

  function togglePendingOrigin(origin) {
    setPendingOrigins((prev) => {
      const exists = prev.includes(origin)
      if (exists) {
        if (prev.length === 1) return prev
        return prev.filter((o) => o !== origin)
      }
      return [ ...prev, origin ]
    })
  }

  function toggleSeries(origins, currentlyAllSelected) {
    setPendingOrigins((prev) => {
      if (currentlyAllSelected) {
        const remaining = prev.filter((o) => !origins.includes(o))
        return remaining.length ? remaining : prev
      }
      const merged = new Set([ ...prev, ...origins ])
      return Array.from(merged)
    })
  }

  function startNewRun() {
    const nextSeed = parseInt(pendingSeed || '', 10)
    const finalSeed = Number.isNaN(nextSeed) ? Date.now() : nextSeed
    const allowedOrigins = pendingOrigins?.length ? pendingOrigins : songOrigins
    setSelectedOrigins(allowedOrigins)
    setSeed(finalSeed)
    setInstrument(pendingInstrument)
    setCurrentAct(0)
    setChoices({})
    setResults({})
    setSelected({ act: 0, row: 0, col: 0 })
    setCurrentRow(0)
    setPhase('idle')
    setSelectedSongs([])
    setStarEntries([])
    setGameOver(false)
    setGear(defaultGear())
    setShopOffers(generateShopOffers(acts, finalSeed))
    setVoltage(startingVoltage)
  }

  function openNewGame() {
    setPendingInstrument(instrument)
    setPendingSeed('')
    setPendingOrigins(selectedOrigins)
    setNewGameOpen(true)
  }

  function confirmNewGame() {
    setNewGameOpen(false)
    startNewRun()
  }

  function equipGear(slot, item) {
    setGear((prev) => ({
      ...prev,
      [ slot ]: item,
    }))
  }
}

function resultsKey(act, row) {
  return `${act}-${row}`
}

function reachableCols(act, row, choices, actIndex) {
  if (!act) return []
  if (row === 0) return act.rows[ 0 ].map((n) => n.col)
  const prevChoice = choices[ actIndex ]?.[ row - 1 ] ?? 0
  const prevRow = act.rows[ row - 1 ] || []
  const node = prevRow.find((n) => n.col === prevChoice) || prevRow[ 0 ]
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
  const nextRow = rows[ rowIdx + 1 ]
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
            const targetNode = nextRow[ target ]
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
        className={`node node-${node.kind} ${selected ? 'node-selected' : ''} ${reachable ? 'node-reachable' : 'node-disabled'
          }`}
      >
        {node.kind === 'boss' ? 'B' : node.kind === 'shop' ? '$' : 'C'}
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

export function isSongToggleAllowed({ phase, isSelected, selectedCount, maxSelectable }) {
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

export function toggleSong(current, song, { minSelectable, maxSelectable }) {
  const exists = current.find((s) => s.id === song.id)
  if (exists) {
    const next = current.filter((s) => s.id !== song.id)
    if (next.length < minSelectable) return current
    return next
  }
  if (current.length >= maxSelectable) return current
  return [ ...current, song ]
}

export function actionForState({
  phase,
  hasSelection,
  canEnter,
  starsComplete,
  canAdvanceRow,
  canAdvanceAct,
  startEnabled,
}) {
  if (phase === 'idle') {
    return { kind: 'start', label: 'Start challenge', disabled: !startEnabled }
  }
  if (phase === 'selecting') {
    return { kind: 'enter', label: 'Enter stars', disabled: !canEnter }
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

export function meetsGoal(goal, entries) {
  if (!goal || !entries || !entries.length) return true
  const nums = entries.map((n) => Number(n)).filter((n) => !Number.isNaN(n))
  if (!nums.length) return true
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length
  return avg >= goal
}

export function calculateVoltageLoss(
  entries,
  { max = maxStars, penaltyPerMissingStar = voltagePenaltyPerMissingStar, goal } = {},
) {
  if (!entries || !entries.length) return 0
  if (goal) {
    const nums = entries.map((n) => Number(n)).filter((n) => !Number.isNaN(n))
    if (!nums.length) return 0
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length
    const deficit = Math.max(0, Math.ceil(goal - avg))
    return deficit * penaltyPerMissingStar
  }
  return entries.reduce((total, entry) => {
    const stars = Math.max(0, Math.min(max, Number(entry) || 0))
    const missing = max - stars
    return total + missing * penaltyPerMissingStar
  }, 0)
}

export function applyVoltageLoss(currentVoltage, entries, opts) {
  const loss = calculateVoltageLoss(entries, opts)
  const remaining = Math.max(0, currentVoltage - loss)
  return { remaining, loss }
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
  const act = acts[ actIndex ]
  const rows = act?.rows ?? []
  const rowIndex = Math.min(Math.max(0, sel?.row ?? 0), rows.length - 1)
  const row = rows[ rowIndex ] || []
  const colValue =
    row.find((n) => n.col === (sel?.col ?? 0))?.col ?? (row[ 0 ]?.col ?? 0)
  return { act: actIndex, row: rowIndex, col: colValue }
}

export function clampRow(row, acts, actIndex) {
  const act = acts[ Math.min(Math.max(0, actIndex), acts.length - 1) ]
  if (!act) return 0
  return Math.min(Math.max(0, row), act.rows.length - 1)
}

export function restoreSelectedSongs(ids, acts, selected) {
  if (!ids || !Array.isArray(ids) || !selected) return []
  const act = acts[ selected.act ]
  const row = act?.rows?.[ selected.row ]
  const node = row?.find((n) => n.col === selected.col)
  const songs = node?.challenge?.songs || []
  const byId = new Map(songs.map((s) => [ s.id, s ]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
}

export function serializeResults(results) {
  if (!results) return {}
  const out = {}
  Object.entries(results).forEach(([ key, value ]) => {
    out[ key ] = { stars: value.stars }
  })
  return out
}

export function restoreResults(saved) {
  if (!saved || typeof saved !== 'object') return {}
  const out = {}
  Object.entries(saved).forEach(([ key, value ]) => {
    out[ key ] = { stars: value?.stars ?? [] }
  })
  return out
}

export function defaultGear() {
  const gear = {}
  gearSlots.forEach((slot) => {
    gear[ slot ] = { id: `${slot}-none`, name: 'None', rarity: 'none' }
  })
  return gear
}

export function generateShopOffers(acts, seed) {
  const offers = {}
  const rng = mulberry32(seed)
  const pool = weightedGearPool()
  acts.forEach((act) => {
    act.rows.forEach((row, rowIdx) => {
      const node = row[ 0 ]
      if (node?.kind !== nodeKinds.shop) return
      const key = `${act.index - 1}-${rowIdx}`
      offers[ key ] = pickGear(pool, 3, rng)
    })
  })
  return offers
}

function weightedGearPool() {
  const weights = { common: 25, uncommon: 5, rare: 2, epic: 1 }
  const items = []
  gearSlots.forEach((slot) => {
    (gearOptions[ slot ] || []).forEach((item) => {
      const w = weights[ item.rarity ] ?? 1
      for (let i = 0; i < w; i++) {
        items.push(item)
      }
    })
  })
  return items
}

function pickGear(pool, count, rng) {
  const result = []
  const seen = new Set()
  while (result.length < count && result.length < pool.length) {
    const item = pool[ Math.floor(rng() * pool.length) ]
    if (seen.has(item.id)) continue
    seen.add(item.id)
    result.push(item)
  }
  return result
}

function mulberry32(seed) {
  let t = seed + 0x6d2b79f5
  return function () {
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
