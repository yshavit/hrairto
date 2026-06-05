use super::window_types::Window;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Opens the Yearly Goals window as a standard, decorated application window
/// and hides the tray popup. On macOS the app is promoted from an accessory to
/// a regular app so that it appears in the app switcher (Cmd-Tab); on Windows
/// the standard window shows in Alt-Tab on its own. The promotion is reverted
/// once the window closes so we go back to being a tray-only app.
#[tauri::command]
pub fn open_yearly_goals(app: AppHandle) {
    if let Some(main) = app.get_webview_window(Window::Main.label()) {
        let _ = main.hide();
    }

    #[cfg(target_os = "macos")]
    let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);

    // Reuse the window if it's already open rather than building a second one.
    if let Some(goals) = app.get_webview_window(Window::Goals.label()) {
        let _ = goals.show();
        let _ = goals.set_focus();
        return;
    }

    let window = match WebviewWindowBuilder::new(&app, Window::Goals.label(), WebviewUrl::App("index.html".into()))
        .title("Yearly Goals")
        .inner_size(900.0, 680.0)
        .min_inner_size(480.0, 360.0)
        .build()
    {
        Ok(window) => window,
        Err(err) => {
            eprintln!("failed to open yearly goals window: {err}");
            return;
        }
    };

    let _ = window.set_focus();

    #[cfg(target_os = "macos")]
    {
        let handle = app.clone();
        window.on_window_event(move |event| {
            // With the standard window gone, drop back to an accessory app so
            // we leave the app switcher again.
            if matches!(event, tauri::WindowEvent::Destroyed) {
                let _ = handle.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }
        });
    }
}
