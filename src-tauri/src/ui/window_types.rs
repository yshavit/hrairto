pub enum Window {
    Main,
}

impl Window {
    pub fn label(&self) -> &'static str {
        match self {
            Window::Main => "main",
        }
    }
}
