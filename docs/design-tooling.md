# Frontend Design Tooling

The web client now includes a shared design tooling stack for faster UI iteration and safer mobile polish.

## Installed libraries

- Tailwind CSS (`tailwindcss`, `postcss`, `autoprefixer`) for tokenized, responsive utility styling.
- shadcn-compatible setup (`components.json`) with Radix primitives and utility helpers.
- Radix UI dialog primitive (`@radix-ui/react-dialog`) for accessible overlays/dialogs.
- Storybook (`@storybook/react-vite`) for isolated component development.
- Playwright visual testing (`@playwright/test`) for breakpoint snapshots.

## File locations

- Tailwind config: `web/tailwind.config.js`
- Token CSS + Tailwind layers: `web/src/index.css`
- shadcn-style primitives:
  - `web/src/components/ui/button.jsx`
  - `web/src/components/ui/card.jsx`
  - `web/src/components/ui/dialog.jsx`
  - `web/src/lib/utils.js`
- Storybook config: `web/.storybook/*`
- Visual snapshot tests: `web/tests/visual/home.spec.js`
- Playwright config: `web/playwright.config.js`

## Commands

From `web/`:

```bash
npm run storybook
npm run build-storybook
npm run test:visual:update
npm run test:visual
```

From repository root:

```bash
make web-storybook
make web-visual-update
make web-visual
```

## Mobile workflow

1. Build or adjust components in Storybook first.
2. Capture/update snapshots for `390x844`, `768x1024`, and `1280x800`.
3. Run `npm run test:visual` before merging UI changes.

## Environment note

Playwright visual tests require Chromium and supporting Linux libraries. If launch errors mention missing dependencies, rebuild the devcontainer so system packages from `.devcontainer/Dockerfile` are present, then run:

```bash
cd web && npx playwright install chromium
```
