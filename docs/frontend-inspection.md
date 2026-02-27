# Frontend Inspection Workflow

Use this when you want Codex to validate frontend changes against the running app.

## Run the web app on a fixed endpoint

From the repository root:

```bash
make web-dev-inspect
```

Or from `web/`:

```bash
npm run dev:inspect
```

This binds Vite to `http://127.0.0.1:4173` with strict port enforcement so tooling can reliably target one URL.

## Capture a screenshot

From the repository root:

```bash
make web-screenshot ARGS="--url http://127.0.0.1:4173 --out ../tmp/frontend.png"
```

Or from `web/`:

```bash
npm run screenshot -- --url http://127.0.0.1:4173 --out ../tmp/frontend.png
```

The screenshot command supports optional sizing and page settings:

```bash
npm run screenshot -- --width 1280 --height 720 --full-page
```

## Dependency note

Screenshot capture uses Playwright (`chromium`). If it is not installed yet:

```bash
cd web && npm install -D playwright
```

If browser launch fails with missing Linux libraries, rebuild the devcontainer so the dependencies from `.devcontainer/Dockerfile` are applied.
