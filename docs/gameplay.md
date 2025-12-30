# Gameplay Loop

- **Seeded run:** Generated at start/reroll; three acts with branching nodes.
- **Path commitment:** Per row, pick one reachable node and commit; you cannot freely jump across the map.
- **Challenges:** Each node is a challenge (see `docs/challenges.md`) with act-based difficulty filters and pool sizes (see `docs/constraints.md`). The song pool is hidden until commitment.
- **Goals:** Each challenge has an act-based average star target (3/4/5). Players select 2–5 songs from the pool, then enter a `0-6` star rating for each.
- **Star entry:** After committing, enter star rating `0-6` to log performance before moving to the next row.
- **Voltage (run HP):** Runs start at 10,000 volts. Each missing star on submitted results costs 1,000 volts (floors at zero). Recovery will be added later.
- **Song origins:** New games can filter the song pool by origin; selections persist between runs.
- **Acts:** Only the current act is shown; switching acts resets selection state for that act while preserving the run seed.
- **Persistence:** The web client autosaves to local storage and can start a fresh run with the “New game” button while keeping the seed indicator visible.

Future integrations (YARG/Clone Hero) will replace manual star entry with real performance data.
