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

```shell
pnpm test          # frontend (vitest)
cargo test         # rust (run from src-tauri/)
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
