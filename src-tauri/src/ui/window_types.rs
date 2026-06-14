pub enum Window {
    Main,
    Goals,
    Weekly,
    Midday,
}

impl Window {
    pub fn label(&self) -> &'static str {
        match self {
            Window::Main => "main",
            Window::Goals => "goals",
            Window::Weekly => "weekly",
            Window::Midday => "midday",
        }
    }
}
