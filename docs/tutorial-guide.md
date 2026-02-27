# Tutorial Guide

The web client includes a first-run guide that explains the core loop.

## Behavior

- On first load, a modal guide opens automatically.
- The guide emphasizes that players must:
  - start a challenge in this app,
  - play the song(s) in their rhythm game,
  - return here to enter star results.
- Completing the guide marks it as seen in local storage.

## Reopening the guide

- Mobile: `Options` mode -> `Open guide`.
- Tablet/Desktop: header `Options` panel -> `Open guide`.

## Implementation

- Guide content/state helpers: `web/src/lib/guide.js`
- Guide overlay and controls: `web/src/App.jsx`
- Guide modal styling: `web/src/App.css`
