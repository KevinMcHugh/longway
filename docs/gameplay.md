# Gameplay Loop

- **Seeded run:** Generated at start/reroll; three acts with branching nodes.
- **Path commitment:** Per row, pick one reachable node and commit; you cannot freely jump across the map.
- **Challenges:** Each node is a challenge (see `docs/challenges.md`) with act-based difficulty filters and pool sizes (see `docs/constraints.md`). The song pool is hidden until commitment.
- **Star entry:** After committing, enter star rating `0-6` to log performance before moving to the next row.
- **Acts:** Only the current act is shown; switching acts resets selection state for that act while preserving the run seed.

Future integrations (YARG/Clone Hero) will replace manual star entry with real performance data.
