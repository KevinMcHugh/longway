# Runtime Themes

The web client supports runtime theme switching.

## Available themes

- `Default`
- `High Contrast`
- `Hell's Bells` (AC/DC-inspired red, black, yellow, and gunmetal palette)

## Where to change theme

- Mobile: `Options` mode (bottom nav -> `Options`).
- Tablet/Desktop: header `Options` button opens an options panel with a theme selector.

## Persistence

Theme choice is saved in the existing run save payload (`longway-save-v1`) and restored on reload.

## Implementation notes

- Theme is applied via `document.documentElement.dataset.theme`.
- Base tokens are defined in `web/src/index.css`.
- High-contrast overrides are defined in `web/src/index.css` and `web/src/App.css` for interactive/game UI surfaces.
