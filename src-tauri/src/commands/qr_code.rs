use std::fs;
use std::path::PathBuf;

const PNG_SIGNATURE: [u8; 8] = [137, 80, 78, 71, 13, 10, 26, 10];

#[tauri::command]
pub fn save_qr_code_png(path: String, png_bytes: Vec<u8>) -> Result<(), String> {
    if png_bytes.len() < PNG_SIGNATURE.len() || png_bytes[..PNG_SIGNATURE.len()] != PNG_SIGNATURE {
        return Err("PNG 데이터가 올바르지 않습니다.".to_string());
    }

    let output_path = PathBuf::from(path);

    if !output_path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("png"))
    {
        return Err("PNG 파일 경로를 선택하세요.".to_string());
    }

    fs::write(&output_path, png_bytes).map_err(|error| format!("PNG 저장 실패: {error}"))
}

#[tauri::command]
pub fn save_qr_code_svg(path: String, svg_text: String) -> Result<(), String> {
    if !svg_text.trim_start().starts_with("<svg") {
        return Err("SVG 데이터가 올바르지 않습니다.".to_string());
    }

    let output_path = PathBuf::from(path);

    if !output_path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("svg"))
    {
        return Err("SVG 파일 경로를 선택하세요.".to_string());
    }

    fs::write(&output_path, svg_text).map_err(|error| format!("SVG 저장 실패: {error}"))
}

#[cfg(test)]
mod tests {
    use super::{save_qr_code_png, save_qr_code_svg};
    use std::fs;

    fn valid_png_bytes() -> Vec<u8> {
        vec![137, 80, 78, 71, 13, 10, 26, 10, 0]
    }

    fn temp_png_path(test_name: &str, extension: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "worker-qr-code-{test_name}-{}.{extension}",
            std::process::id()
        ))
    }

    fn temp_svg_path(test_name: &str, extension: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "worker-qr-code-{test_name}-{}.{extension}",
            std::process::id()
        ))
    }

    #[test]
    fn saves_png_bytes_to_selected_path() {
        let path = temp_png_path("lowercase", "png");

        save_qr_code_png(path.to_string_lossy().to_string(), valid_png_bytes()).unwrap();

        assert_eq!(fs::read(&path).unwrap(), valid_png_bytes());

        fs::remove_file(path).unwrap();
    }

    #[test]
    fn accepts_uppercase_png_extension() {
        let path = temp_png_path("uppercase", "PNG");

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

    #[test]
    fn saves_svg_text_to_selected_path() {
        let path = temp_svg_path("svg-lowercase", "svg");
        let svg_text = r#"<svg xmlns="http://www.w3.org/2000/svg"></svg>"#.to_string();

        save_qr_code_svg(path.to_string_lossy().to_string(), svg_text.clone()).unwrap();

        assert_eq!(fs::read_to_string(&path).unwrap(), svg_text);

        fs::remove_file(path).unwrap();
    }

    #[test]
    fn accepts_uppercase_svg_extension() {
        let path = temp_svg_path("svg-uppercase", "SVG");
        let svg_text = r#"<svg xmlns="http://www.w3.org/2000/svg"></svg>"#.to_string();

        save_qr_code_svg(path.to_string_lossy().to_string(), svg_text.clone()).unwrap();

        assert_eq!(fs::read_to_string(&path).unwrap(), svg_text);

        fs::remove_file(path).unwrap();
    }

    #[test]
    fn rejects_non_svg_text() {
        let result = save_qr_code_svg("qr.svg".to_string(), "not svg".to_string());

        assert_eq!(result, Err("SVG 데이터가 올바르지 않습니다.".to_string()));
    }

    #[test]
    fn rejects_non_svg_extension() {
        let result = save_qr_code_svg(
            "qr.txt".to_string(),
            r#"<svg xmlns="http://www.w3.org/2000/svg"></svg>"#.to_string(),
        );

        assert_eq!(result, Err("SVG 파일 경로를 선택하세요.".to_string()));
    }
}
