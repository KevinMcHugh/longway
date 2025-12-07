# Challenges

Challenges gate progress on the route. Each challenge presents a pool of songs and asks the player to choose any three to play. Current challenge types:

- **TestChallenge**: Fallback; defaults to Eye of the Tiger when the catalog is thin.
- **DecadeChallenge**: Songs from a single decade.
- **LongSongChallenge**: Songs over five minutes.
- **GenreChallenge**: Songs from a single genre.
- **DifficultyChallenge**: Songs at a specific numeric difficulty (0–6).

Challenge pools are sized per act (see `docs/acts.md`) and are filtered by act difficulty constraints (see `docs/constraints.md`). The TUI hides the exact song list until a node is committed.
