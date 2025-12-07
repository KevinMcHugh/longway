# AGENTS

## Mission
- Build a terminal-first roguelike that resolves encounters through rhythm gameplay (YARG/Clone Hero style).
- Preserve the FTL-style map pacing and Slay the Spire deck/draft feel while keeping the UI fast and readable.

## Working Agreements
- Default to Go 1.22+ with Bubble Tea, Bubbles, and Lip Gloss. Add new deps only when justified by a feature.
- Keep runs deterministic where possible; isolate randomness behind clearly named helpers.
- Prefer composable Bubble Tea models over monoliths. Share styles and layout helpers instead of duplicating string builders.
- Write small, purposeful commits; describe intent and behavior changes in commit messages.
- Format with `gofmt`; avoid non-ASCII unless the file already uses it intentionally.
- Every change should land with tests that cover the behavior; if a test cannot be written, call it out explicitly and explain why.
- Once tests pass, create a commit. Keep the subject short, start with a present-tense verb, and use a longer body to explain the change and its motivation.

## Rhythm Integration
- Treat rhythm execution as an external boundary: plan for adapters that can call out to YARG/Clone Hero chart/playback handlers.
- Keep IO blocking out of the main Tea update loop—use commands and messages to communicate results.
- Ensure the TUI remains interactive even if rhythm integrations stall or fail; always expose a recovery path.

## Testing and Quality
- Add unit tests for logic-heavy helpers; smoke-test new models with `go test ./...` when possible.
- Validate sizing and layout for narrow terminals; avoid hard-coded widths without fallbacks.
- Document new commands/controls in the README when you ship them.

## Security and Safety
- Never write to locations outside the workspace unless explicitly approved.
- Guard against panics inside update/view code; fail loudly with helpful errors instead of silent exits.
