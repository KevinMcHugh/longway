import './App.css'
import { generateRun } from './lib/path'
import { useMemo, useState } from 'react'

const rowSpacing = 70
const colSpacing = 80
const nodeSize = 32

function App() {
  const { acts, seed } = useMemo(() => generateRun(Date.now()), [])
  const [currentAct, setCurrentAct] = useState(0)
  const [selected, setSelected] = useState({ act: 0, row: 0, col: 0 })

  const current = acts[currentAct]
  const selectedNode =
    current?.rows[selected.row]?.find((n) => n.col === selected.col) ?? current?.rows[0]?.[0]

  // keep selection in bounds when act changes
  if (selected.act !== currentAct) {
    setSelected({ act: currentAct, row: 0, col: 0 })
  }

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
              onClick={() => setCurrentAct((a) => Math.max(0, a - 1))}
              disabled={currentAct === 0}
            >
              Prev Act
            </button>
            <span>
              Act {currentAct + 1} / {acts.length}
            </span>
            <button
              onClick={() => setCurrentAct((a) => Math.min(acts.length - 1, a + 1))}
              disabled={currentAct === acts.length - 1}
            >
              Next Act
            </button>
          </div>

          <section className="acts">
            <ActView
              act={current}
              onSelect={(row, col) => setSelected({ act: currentAct, row, col })}
              selected={selected}
            />
          </section>
        </div>
        <aside className="pane right">
          {selectedNode ? (
            <div className="details">
              <p className="eyebrow">Challenge</p>
              <h3>{selectedNode.challenge?.name ?? 'Unknown'}</h3>
              <p className="lede">{selectedNode.challenge?.summary}</p>
              {selectedNode.challenge?.songs && (
                <ul>
                  {selectedNode.challenge.songs.map((s) => (
                    <li key={`${s.id}-${s.title}`}>
                      <strong>{s.title}</strong> — {s.artist}{' '}
                      {s.year ? <span className="meta">({s.year})</span> : null}
                      {s.genre ? <span className="meta"> • {s.genre}</span> : null}
                      {s.length ? <span className="meta"> • {s.length}</span> : null}
                      {s.difficulty ? <span className="meta"> • diff {s.difficulty}/6</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="lede">Select a node to see details.</p>
          )}
        </aside>
      </div>
    </main>
  )
}

function ActView({ act, selected, onSelect }) {
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
          />
        ))}
      </div>
    </div>
  )
}

function RowView({ row, rowIdx, rows, onSelect, selected }) {
  const y = (rows.length - 1 - rowIdx) * rowSpacing
  const nextRow = rows[rowIdx + 1]
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

function NodeView({ node, x, y, selected }) {
  return (
    <div className="node-wrapper" style={{ left: x, top: y }}>
      <div className={`node node-${node.kind} ${selected ? 'node-selected' : ''}`}>
        {node.kind === 'boss' ? 'B' : 'C'}
      </div>
    </div>
  )
}

export default App
