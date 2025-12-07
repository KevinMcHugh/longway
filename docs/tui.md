# TUI

The interface uses Bubble Tea + Lip Gloss. Key behaviors:
- Shows only the current act graph with reachable nodes highlighted.
- Legend shows node type; challenge previews hide the actual song pool until you commit.
- Controls: `←/→` move between reachable nodes in the current row; `enter` commits a node and prompts for stars; `[`/`]` switch acts; `r` reroll run; `q` quit.
- Preview shows challenge name/summary and star input/status; song lists remain hidden for imperfect information.

Styling uses simple glyphs (`C` for challenge) and bordered panels for the act view and preview.
