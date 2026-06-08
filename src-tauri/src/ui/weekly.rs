use super::window_types::Window;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Opens the Weekly Planning & Reflection window and hides the tray popup.
/// Reuses the window if it is already open.
#[tauri::command]
#[specta::specta]
pub async fn open_weekly_planning(app: AppHandle) {
    if let Some(main) = app.get_webview_window(Window::Main.label()) {
        let _ = main.hide();
    }

    #[cfg(target_os = "macos")]
    let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);

    if let Some(weekly) = app.get_webview_window(Window::Weekly.label()) {
        let _ = weekly.show();
        let _ = weekly.set_focus();
        return;
    }

    let window = match WebviewWindowBuilder::new(&app, Window::Weekly.label(), WebviewUrl::App("index.html".into()))
        .title("Weekly Planning")
        .inner_size(900.0, 800.0)
        .min_inner_size(600.0, 500.0)
        .build()
    {
        Ok(window) => window,
        Err(err) => {
            eprintln!("failed to open weekly planning window: {err}");
            return;
        }
    };

    let _ = window.set_focus();

    #[cfg(target_os = "macos")]
    {
        let handle = app.clone();
        window.on_window_event(move |event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                let _ = handle.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }
        });
    }
}
