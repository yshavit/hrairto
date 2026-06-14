use super::window_types::Window;
use tauri::{AppHandle, LogicalSize, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder};

/// Called by the webview after first render to set the window to its content height and show it.
#[tauri::command]
#[specta::specta]
pub async fn show_midday(app: AppHandle, height: f64) {
    let Some(window) = app.get_webview_window(Window::Midday.label()) else {
        return;
    };
    let _ = window.set_size(LogicalSize::new(480.0_f64, height));
    let _ = window.show();
    let _ = window.set_focus();
}

/// Called by the webview whenever content height changes after the initial show.
/// On Windows the bottom edge is held fixed (tray at bottom); on macOS the top
/// edge is held fixed (menu bar at top).
#[tauri::command]
#[specta::specta]
pub async fn resize_midday(app: AppHandle, height: f64) {
    let Some(window) = app.get_webview_window(Window::Midday.label()) else {
        return;
    };

    #[cfg(target_os = "windows")]
    if let (Ok(pos), Ok(outer), Ok(inner)) = (
        window.outer_position(),
        window.outer_size(),
        window.inner_size(),
    ) {
        let scale = window.scale_factor().unwrap_or(1.0);
        let non_client_h = outer.height as i32 - inner.height as i32;
        let new_outer_h = (height * scale).round() as i32 + non_client_h;
        let new_y = pos.y + outer.height as i32 - new_outer_h;
        let _ = window.set_position(PhysicalPosition::new(pos.x, new_y));
    }

    let _ = window.set_size(LogicalSize::new(480.0_f64, height));
}

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
    .inner_size(480.0, 400.0)
    .decorations(false)
    .resizable(false)
    .visible(false)
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
