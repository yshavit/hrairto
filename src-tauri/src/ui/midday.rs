use super::window_types::Window;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Opens the Mid-day Check-in window and hides the tray popup.
/// Reuses the window if it is already open.
#[tauri::command]
#[specta::specta]
pub async fn open_midday_checkin(app: AppHandle) {
    if let Some(main) = app.get_webview_window(Window::Main.label()) {
        let _ = main.hide();
    }

    #[cfg(target_os = "macos")]
    let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);

    if let Some(midday) = app.get_webview_window(Window::Midday.label()) {
        let _ = midday.show();
        let _ = midday.set_focus();
        return;
    }

    let window = match WebviewWindowBuilder::new(
        &app,
        Window::Midday.label(),
        WebviewUrl::App("ui-test-entrypoints/midday.html".into()),
    )
    .title("Mid-day Check-in")
    .inner_size(600.0, 640.0)
    .min_inner_size(400.0, 400.0)
    .build()
    {
        Ok(window) => window,
        Err(err) => {
            eprintln!("failed to open midday check-in window: {err}");
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
