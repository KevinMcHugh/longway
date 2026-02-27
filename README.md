# Long Way To The Top

Long Way To The Top is a terminal-first roguelike that swaps combat for rhythm. Think FTL's sector hops, Slay the Spire's drafting, and Balatro's escalation, but each encounter is decided by how well you shred a YARG/Clone Hero chart.

## Status
- Tech stack: Go + Bubble Tea + Lip Gloss (TUI first).
- Prototype loop: lightweight climb visualizer that simulates stage progression.
- Goal: grow toward rhythm-driven encounters while keeping everything keyboard-friendly.

## Getting Started
1) Install Go 1.24+ (Bubble Tea v1.3.x targets >=1.24). If you prefer a self-contained toolchain, set `PATH=.local-go/go/bin:$PATH` after unpacking a Go tarball into `.local-go/`.
2) Install dependencies: `go mod tidy`
3) Run the prototype: `go run ./cmd/longway`

### Web client (React)
- `cd web && npm install`
- Run the client with `npm run dev`.
- For Codex/frontend inspection, run `npm run dev:inspect` to bind to a fixed endpoint: <http://127.0.0.1:4173>.
- Capture a screenshot with `npm run screenshot -- --url http://127.0.0.1:4173 --out ../tmp/frontend.png`.
- Run web tests with `npm test -- --run`.
- Root shortcuts:
  - `make web-dev-inspect`
  - `make web-screenshot ARGS="--url http://127.0.0.1:4173 --out ../tmp/frontend.png"`
- If Playwright reports missing Linux libs, rebuild the devcontainer to pick up the updated `.devcontainer/Dockerfile`.

Controls in the prototype:
- `space`: pause/resume the climb
- `n`: move to the next stage of the route
- `r`: reset the current stage progress
- `q` or `ctrl+c`: quit

## Project Layout
- `cmd/longway/main.go`: Bubble Tea entry point and placeholder loop that visualizes climbing through stages.
- `go.mod`, `go.sum`: module definition and locked dependencies.

## Roadmap Sketch
- Map layer that mirrors FTL's branching sectors.
- Deck/draft layer for perks and modifiers inspired by Slay the Spire.
- Rhythm layer that calls out to YARG/Clone Hero-style charts to resolve encounters.
- Progression, unlocks, and meta upgrades that keep runs fresh.

## Development Notes
- Format with `gofmt`.
- Keep the TUI responsive; prefer non-blocking updates and minimal redraw churn.
- Bubble Tea/Bubbles/Lip Gloss are the core UI dependencies—add others only when the feature demands it.
