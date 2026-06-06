fn main() {
    #[cfg(windows)]
    let attributes = {
        add_manifest();
        tauri_build::Attributes::new().windows_attributes(tauri_build::WindowsAttributes::new_without_app_manifest())
    };
    #[cfg(not(windows))]
    let attributes = tauri_build::Attributes::new();

    tauri_build::try_build(attributes).unwrap();
}

// Embed our own Windows application manifest into *every* binary this crate links,
// replacing the one tauri-build embeds only into the app binary.
//
// The reason is `cargo test`. Its harness binaries are linked separately from the app
// and so never receive tauri-build's manifest. Tauri's windowing stack (tao) statically
// imports ComCtl32 v6 functions such as `TaskDialogIndirect`, which the System32
// comctl32 v5.82 forwarding stub does not export. With no manifest declaring a
// dependency on Common-Controls v6, the loader binds comctl32 to that stub and the test
// exe aborts at startup with STATUS_ENTRYPOINT_NOT_FOUND (0xc0000139) before any test
// runs. (The app binary is fine because tauri-build's manifest carries that dependency.)
//
// Passing the manifest as a plain `rustc-link-arg` — rather than letting tauri-build add
// it — makes it apply to all linked outputs alike: app, cdylib, and test binaries. So
// the tests, too, resolve comctl32 to v6. windows-app-manifest.xml keeps the rest of
// Tauri's default manifest settings (DPI awareness, supportedOS, longPathAware,
// asInvoker), since we've opted out of tauri-build supplying its own.
#[cfg(windows)]
fn add_manifest() {
    static WINDOWS_MANIFEST_FILE: &str = "windows-app-manifest.xml";

    let manifest = std::env::current_dir().unwrap().join(WINDOWS_MANIFEST_FILE);

    println!("cargo:rerun-if-changed={}", manifest.display());
    println!("cargo:rustc-link-arg=/MANIFEST:EMBED");
    println!("cargo:rustc-link-arg=/MANIFESTINPUT:{}", manifest.to_str().unwrap());
    // Treat linker warnings as errors, so a malformed manifest fails the build loudly.
    println!("cargo:rustc-link-arg=/WX");
}
