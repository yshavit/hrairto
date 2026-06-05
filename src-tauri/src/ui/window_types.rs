pub enum Window {
    Main,
    Goals,
}

impl Window {
    pub fn label(&self) -> &'static str {
        match self {
            Window::Main => "main",
            Window::Goals => "goals",
        }
    }
}
