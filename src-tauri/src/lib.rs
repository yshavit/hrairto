pub mod calendar;
pub mod models;
mod ui;

use specta_typescript::{BigIntExportBehavior, Typescript};
use tauri_specta::{collect_commands, Builder};

/// TypeScript exporter config shared by `run` and the export test.
/// `i64`/`u64` timestamps are emitted as `number` rather than `bigint`: every
/// timestamp here is a Unix value (seconds or milliseconds) far below
/// `Number.MAX_SAFE_INTEGER`, and the frontend works with them as plain numbers.
#[allow(dead_code)]
fn ts_exporter() -> Typescript {
    Typescript::default().bigint(BigIntExportBehavior::Number).header(
        [
            // We don't want to format generated files; if we do, CI checks for drift will fail
            "// @formatter:off",
            // No use linting them, either
            "// @ts-nocheck",
            "// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols",
        ]
        .join("\n"),
    )
}

/// Quits the application, exiting the process.
#[tauri::command]
#[specta::specta]
fn quit(app: tauri::AppHandle) {
    app.exit(0);
}

/// Builds the tauri-specta [`Builder`] that is the single source of truth for the
/// invoke handler and for the generated TypeScript bindings. Both `run` and the
/// bindings-export test use this so the registered commands and types can never drift
/// between what the app exposes and what the frontend is typed against.
fn specta_builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new()
        .commands(collect_commands![ui::goals::open_yearly_goals, quit])
        // No command returns this yet (phase 1 has no data commands), so register it
        // explicitly; this transitively exports every nested model type too.
        .typ::<models::GoalTreeData>()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = specta_builder();

    #[cfg(debug_assertions)]
    builder
        .export(ts_exporter(), "../src/bindings.ts")
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            ui::tray::setup(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Regenerates `src/bindings.ts` and guards that type export never panics
    /// (e.g. from a type specta can't represent). Running `cargo test` keeps the
    /// committed bindings in sync without needing to launch the GUI.
    #[test]
    fn exports_typescript_bindings() {
        specta_builder()
            .export(ts_exporter(), "../src/bindings.ts")
            .expect("failed to export typescript bindings");
    }
}
