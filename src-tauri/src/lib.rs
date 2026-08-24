// Todo el trabajo vive en el frontend: leer, unir y escribir PDFs se hace en JS
// (pdf-lib / pdf.js) sobre los plugins de Tauri. Rust solo levanta la ventana.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
