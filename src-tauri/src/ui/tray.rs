use super::window_types::Window;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition,
};

enum WindowAction {
    Show,
    Hide,
}

#[derive(Clone)]
struct ScreenRect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

struct MonitorBounds {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

/// Returns the (x, y) position for a window anchored to a tray icon.
/// Places the window above the tray when it's in the bottom half of the monitor
/// (Windows taskbar), or below when it's in the top half (macOS menu bar).
/// Horizontally centered on the icon, clamped to stay on-screen.
fn window_position_for_tray(tray: &ScreenRect, win_width: u32, win_height: u32, monitor: &MonitorBounds) -> (i32, i32) {
    let tray_center_y = tray.y + tray.height / 2.0;
    let monitor_mid_y = monitor.y as f64 + monitor.height as f64 / 2.0;

    let x = (tray.x + tray.width / 2.0) as i32 - win_width as i32 / 2;
    let y = if tray_center_y >= monitor_mid_y {
        tray.y as i32 - win_height as i32
    } else {
        (tray.y + tray.height) as i32
    };

    let x = x
        .max(monitor.x)
        .min(monitor.x + monitor.width as i32 - win_width as i32);
    let y = y
        .max(monitor.y)
        .min(monitor.y + monitor.height as i32 - win_height as i32);

    (x, y)
}

/// How recently the window must have been hidden by a focus-loss for a
/// subsequent tray click to be treated as "the same gesture closed it".
const BLUR_TOGGLE_DEBOUNCE: Duration = Duration::from_millis(250);

struct TrayState {
    /// Last observed tray icon rectangle, in physical pixels.
    rect: Mutex<Option<ScreenRect>>,
    /// When the window was last hidden due to losing focus.
    last_hidden: Mutex<Option<Instant>>,
}

/// Extracts the tray icon rectangle from an event, always in **physical**
/// pixels. Logical coordinates are scaled up by `scale` so the result is
/// directly comparable to monitor bounds and usable with `Position::Physical`.
fn screen_rect_from_event(event: &TrayIconEvent, scale: f64) -> Option<ScreenRect> {
    let r = match event {
        TrayIconEvent::Click { rect, .. } | TrayIconEvent::Enter { rect, .. } | TrayIconEvent::Move { rect, .. } => {
            rect
        }
        _ => return None,
    };
    let (x, y) = match &r.position {
        tauri::Position::Physical(p) => (p.x as f64, p.y as f64),
        tauri::Position::Logical(l) => (l.x * scale, l.y * scale),
    };
    let (width, height) = match &r.size {
        tauri::Size::Physical(s) => (s.width as f64, s.height as f64),
        tauri::Size::Logical(s) => (s.width * scale, s.height * scale),
    };
    Some(ScreenRect { x, y, width, height })
}

fn position_window_near_tray(app: &AppHandle) {
    let Some(window) = app.get_webview_window(Window::Main.label()) else {
        return;
    };

    let tray_rect = {
        let state = app.state::<TrayState>();
        let guard = state.rect.lock().unwrap();
        guard.clone()
    };
    let Some(rect) = tray_rect else { return };

    let Ok(win_size) = window.outer_size() else {
        return;
    };
    let tray_cx = (rect.x + rect.width / 2.0) as i32;
    let tray_cy = (rect.y + rect.height / 2.0) as i32;

    // Prefer the monitor the tray icon sits on; fall back to the primary
    // monitor so we still clamp on-screen when the lookup misses.
    let monitors = window.available_monitors().unwrap_or_default();
    let monitor = monitors
        .iter()
        .find(|m| {
            let p = m.position();
            let s = m.size();
            tray_cx >= p.x && tray_cx < p.x + s.width as i32 && tray_cy >= p.y && tray_cy < p.y + s.height as i32
        })
        .cloned()
        .or_else(|| window.primary_monitor().ok().flatten());

    let (x, y) = match monitor {
        Some(mon) => window_position_for_tray(
            &rect,
            win_size.width,
            win_size.height,
            &MonitorBounds {
                x: mon.position().x,
                y: mon.position().y,
                width: mon.size().width,
                height: mon.size().height,
            },
        ),
        // No monitor info at all: best-effort centering above the tray icon.
        None => (tray_cx - win_size.width as i32 / 2, tray_cy - win_size.height as i32),
    };

    let _ = window.set_position(tauri::Position::Physical(PhysicalPosition::new(x, y)));
}

fn apply_toggle(app: &AppHandle) {
    let Some(window) = app.get_webview_window(Window::Main.label()) else {
        return;
    };
    let visible = window.is_visible().unwrap_or(false);

    // A click on the tray icon while the window is open first steals focus,
    // which hides the window via the focus-loss handler. Without this guard
    // the click would then immediately re-show it. If we were hidden by a
    // blur in the last fraction of a second, treat this click as the close.
    if !visible {
        let state = app.state::<TrayState>();
        let recently_hidden = state
            .last_hidden
            .lock()
            .unwrap()
            .is_some_and(|t| t.elapsed() < BLUR_TOGGLE_DEBOUNCE);
        if recently_hidden {
            *state.last_hidden.lock().unwrap() = None;
            return;
        }
    }

    let window_action = if visible {
        WindowAction::Hide
    } else {
        WindowAction::Show
    };
    match window_action {
        WindowAction::Show => {
            position_window_near_tray(app);
            let _ = window.show();
            let _ = window.set_focus();
        }
        WindowAction::Hide => {
            let _ = window.hide();
        }
    }
}

pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    app.manage(TrayState {
        rect: Mutex::new(None),
        last_hidden: Mutex::new(None),
    });

    #[cfg(target_os = "macos")]
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);

    let app_handle = app.handle().clone();
    let win = app.get_webview_window(Window::Main.label()).unwrap();
    win.on_window_event(move |event| match event {
        tauri::WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();
            if let Some(w) = app_handle.get_webview_window("main") {
                let _ = w.hide();
            }
        }
        // Behave like a typical menubar popup: dismiss on focus loss.
        tauri::WindowEvent::Focused(false) => {
            if let Some(w) = app_handle.get_webview_window("main") {
                let _ = w.hide();
            }
            *app_handle.state::<TrayState>().last_hidden.lock().unwrap() = Some(Instant::now());
        }
        _ => {}
    });

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .on_tray_icon_event(|tray, event| {
            let app = tray.app_handle();
            if let Some(window) = app.get_webview_window(Window::Main.label()) {
                let scale = window.scale_factor().unwrap_or(1.0);
                if let Some(r) = screen_rect_from_event(&event, scale) {
                    *app.state::<TrayState>().rect.lock().unwrap() = Some(r);
                }
            }
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                apply_toggle(app);
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn monitor_1080p() -> MonitorBounds {
        MonitorBounds {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        }
    }

    #[test]
    fn tray_at_bottom_puts_window_above() {
        let tray = ScreenRect {
            x: 1850.0,
            y: 1055.0,
            width: 20.0,
            height: 20.0,
        };
        let (_, y) = window_position_for_tray(&tray, 400, 500, &monitor_1080p());
        assert_eq!(y, 1055 - 500);
    }

    #[test]
    fn tray_at_top_puts_window_below() {
        let tray = ScreenRect {
            x: 1800.0,
            y: 5.0,
            width: 20.0,
            height: 20.0,
        };
        let (_, y) = window_position_for_tray(&tray, 400, 500, &monitor_1080p());
        assert_eq!(y, 25);
    }

    #[test]
    fn window_clamped_to_right_monitor_edge() {
        let tray = ScreenRect {
            x: 1910.0,
            y: 1055.0,
            width: 20.0,
            height: 20.0,
        };
        let (x, _) = window_position_for_tray(&tray, 400, 500, &monitor_1080p());
        assert!(x + 400 <= 1920, "window right edge ({}) exceeds monitor", x + 400);
    }

    #[test]
    fn second_monitor_offset() {
        let monitor = MonitorBounds {
            x: 1920,
            y: 0,
            width: 1920,
            height: 1080,
        };
        let tray = ScreenRect {
            x: 3800.0,
            y: 1055.0,
            width: 20.0,
            height: 20.0,
        };
        let (x, y) = window_position_for_tray(&tray, 400, 500, &monitor);
        assert!(x >= 1920, "window left edge ({x}) should be on second monitor");
        assert!(x + 400 <= 3840, "window right edge ({}) exceeds monitor", x + 400);
        assert_eq!(y, 1055 - 500);
    }
}
