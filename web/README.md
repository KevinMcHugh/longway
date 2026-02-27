# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Local inspection helpers

- `npm run dev:inspect` runs Vite on `http://127.0.0.1:4173` with `--strictPort`.
- `npm run screenshot -- --url http://127.0.0.1:4173 --out ../tmp/frontend.png` captures a headless screenshot using Playwright.

## Design tooling

- Tailwind CSS is configured in `tailwind.config.js` with shared tokens in `src/index.css`.
- shadcn-compatible components live in `src/components/ui`.
- Start Storybook with `npm run storybook`.
- Run visual snapshot tests with `npm run test:visual` (or create baselines with `npm run test:visual:update`).
- Runtime theme switching (Default / High Contrast) is available in mobile `Options` mode and desktop/tablet header `Options`.
