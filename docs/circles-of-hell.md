# Circles of Hell (Ascension System)

`Circles of Hell` is the run-level difficulty progression system, modeled after ascension-style ladders.

## Scope

- Circles range from `1` to `9`.
- Circle selection affects song eligibility by `intensity` (`0-6`).
- This system is global for the run and applies before challenge-specific filters.

## Intensity Rules by Circle

| Circle | Allowed Song Intensities |
| --- | --- |
| 1 | `0` |
| 2 | `0-1` |
| 3 | `0-2` |
| 4 | `0-3` |
| 5 | `0-4` |
| 6 | `0-5` |
| 7 | `0-6` |
| 8 | `3-6` |
| 9 | `5-6` |

## Design Notes

- For Circles `1-7`, progression only raises the top-end cap; lower intensities remain available.
- Circle `7` still allows intensity `0` songs.
- Circle `8` removes low-intensity songs (`0-2`).
- Circle `9` is the hardest bracket and only permits intensities `5-6`.

## Integration Plan (for implementation)

- Add `circle` to run state and persistence.
- Apply circle filtering to candidate songs before challenge pool generation.
- Keep fallback behavior explicit: if circle + act + challenge filters empty a pool, document and implement deterministic recovery.
- Surface current circle in TUI/web run headers.
