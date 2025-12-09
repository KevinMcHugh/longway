# Challenges

Challenges gate progress on the route. Each challenge presents a pool of songs and asks the player to choose between one and three tracks to play (selection minimum/maximum is fixed; pool size varies by act). Current challenge types:

- **TestChallenge**: Fallback; defaults to Eye of the Tiger when the catalog is thin.
- **DecadeChallenge**: Songs from a single decade.
- **GenreChallenge**: Songs from a single genre.
- **DifficultyChallenge**: Songs at a specific numeric difficulty (0–6).
- **LongSongChallenge**: Songs over five minutes.
- **ShortSongChallenge**: Songs at or under 2:30.
- **MediumSongChallenge**: Songs between 2:31 and 4:59.
- **EpicSongChallenge**: Songs over seven minutes.

Challenge pools are sized per act (see `docs/acts.md`) and are filtered by act difficulty constraints (see `docs/constraints.md`). Every challenge carries a **goal** (average star target) based on the act: 3★ in Act 1, 4★ in Act 2, 5★ in Act 3. The TUI hides the exact song list until a node is committed.
