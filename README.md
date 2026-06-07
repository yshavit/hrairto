# Hrairto

Local-first desktop app for cascading goal planning and daily work tracking. Tauri + React + TypeScript.

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

## Test

Frontend unit tests (vitest):

```shell
pnpm test
```

Interaction tests — starts a local dev server automatically:

```shell
pnpm test:e2e
```

Watch interaction tests run with a live timeline and DOM snapshots:

```shell
pnpm playwright test --ui
```

Rust (run from `src-tauri/`):

```shell
cargo test
```

Each window has a test entry point in `ui-test-entrypoints/` that renders it
directly in a browser, without going through the tray app.

**Failure screenshots** (Playwright only): when a test fails, a screenshot is saved
to `test-results/<test-name>-chromium/screenshot.png` locally. In CI, the same
files are uploaded as the `playwright-test-results` artifact on the GitHub Actions
run page — visible under the run summary whether the job passes or fails.
