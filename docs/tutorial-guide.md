# Tutorial Guide

The web client now uses progressive guide flows instead of one long onboarding modal.

## Behavior

- First load opens the `intro` flow automatically.
- `intro` is intentionally short:
  - explain this app as a roguelike layer paired with an existing rhythm game,
  - prompt the player to select a challenge from the map.
- Later guides unlock as the run advances:
  - `play-loop` when the player starts selecting songs for a challenge,
  - `score-entry` when the player reaches the star entry phase.
- Each guide flow is tracked independently in local storage and is only auto-shown once.
- The first guide step does not render a `Back` button.

## Reopening the guide

- Mobile: `Options` mode -> `Open guide`.
- Tablet/Desktop: header `Options` panel -> `Open guide`.
- Reopening launches the `intro` flow from step 1.

## Implementation

- Guide content/state helpers: `web/src/lib/guide.js`
- Guide flow triggering and modal controls: `web/src/App.jsx`
- Guide modal styling: `web/src/App.css`
