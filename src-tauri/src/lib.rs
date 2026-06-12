mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            crate::commands::qr_code::save_qr_code_png,
            crate::commands::qr_code::save_qr_code_svg
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
