# Hrairto

Local-first desktop app for cascading goal planning and daily work tracking. Tauri + React + TypeScript.

## First-time setup

Recommended:

```shell
git config core.hooksPath .githooks
```

## Run (dev mode)

```shell
pnpm install
pnpm tauri dev
```

## Build

```shell
pnpm tauri build   # full desktop bundle
pnpm build         # frontend only (tsc && vite build)
```

Run the built target:

- Bare binary: `src-tauri/target/release/hrairto[.exe]`
- Installers: `src-tauri/target/release/bundle/*` (system-dependent)

## Check / test

Quick checks — formatting (Prettier + `cargo fmt`), TypeScript types, lint — run automatically on every commit via the pre-commit hook, or manually:

```shell
pnpm all:quick
```

Full CI check (all of the above + all three test suites):

```shell
pnpm all
```

Individual test suites:

```shell
pnpm test:ts-unit   # vitest unit tests
pnpm test:rust      # cargo test
pnpm test:e2e       # Playwright interaction tests (starts a local dev server automatically)
pnpm test:all       # all three suites together
```

Watch interaction tests run with a live timeline and DOM snapshots:

```shell
pnpm playwright test --ui
```

Each window has a test entry point in `ui-test-entrypoints/` that renders it
directly in a browser, without going through the tray app.

**Failure screenshots** (Playwright only): when a test fails, a screenshot is saved
to `test-results/<test-name>-chromium/screenshot.png` locally. In CI, the same
files are uploaded as the `playwright-test-results` artifact on the GitHub Actions
run page — visible under the run summary whether the job passes or fails.
