use std::fs;
use std::path::PathBuf;

const PNG_SIGNATURE: [u8; 8] = [137, 80, 78, 71, 13, 10, 26, 10];

#[tauri::command]
pub fn save_qr_code_png(path: String, png_bytes: Vec<u8>) -> Result<(), String> {
    if png_bytes.len() < PNG_SIGNATURE.len() || png_bytes[..PNG_SIGNATURE.len()] != PNG_SIGNATURE {
        return Err("PNG 데이터가 올바르지 않습니다.".to_string());
    }

    let output_path = PathBuf::from(path);

    if output_path.extension().and_then(|extension| extension.to_str()) != Some("png") {
        return Err("PNG 파일 경로를 선택하세요.".to_string());
    }

    fs::write(&output_path, png_bytes).map_err(|error| format!("PNG 저장 실패: {error}"))
}

#[cfg(test)]
mod tests {
    use super::save_qr_code_png;
    use std::fs;

    fn valid_png_bytes() -> Vec<u8> {
        vec![137, 80, 78, 71, 13, 10, 26, 10, 0]
    }

    #[test]
    fn saves_png_bytes_to_selected_path() {
        let path = std::env::temp_dir().join(format!(
            "worker-qr-code-test-{}.png",
            std::process::id()
        ));

        save_qr_code_png(path.to_string_lossy().to_string(), valid_png_bytes()).unwrap();

        assert_eq!(fs::read(&path).unwrap(), valid_png_bytes());

        fs::remove_file(path).unwrap();
    }

    #[test]
    fn rejects_non_png_bytes() {
        let result = save_qr_code_png("qr.png".to_string(), vec![1, 2, 3]);

        assert_eq!(result, Err("PNG 데이터가 올바르지 않습니다.".to_string()));
    }

    #[test]
    fn rejects_non_png_extension() {
        let result = save_qr_code_png("qr.txt".to_string(), valid_png_bytes());

        assert_eq!(result, Err("PNG 파일 경로를 선택하세요.".to_string()));
    }
}
