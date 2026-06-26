use image::{ImageFormat, ImageReader};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Clone, Copy, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ImageFormatConversionTarget {
    Png,
    Jpeg,
    Heic,
    Webp,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertedImageFile {
    original_path: String,
    output_path: String,
}

struct ConversionPlan {
    source_path: PathBuf,
    target_path: PathBuf,
}

#[tauri::command]
pub fn convert_image_formats(
    paths: Vec<String>,
    target_format: ImageFormatConversionTarget,
) -> Result<Vec<ConvertedImageFile>, String> {
    let plans = create_conversion_plans(paths, target_format)?;
    let mut converted_files = Vec::with_capacity(plans.len());

    for plan in plans {
        convert_image_file(&plan.source_path, &plan.target_path, target_format)?;
        converted_files.push(ConvertedImageFile {
            original_path: plan.source_path.to_string_lossy().to_string(),
            output_path: plan.target_path.to_string_lossy().to_string(),
        });
    }

    Ok(converted_files)
}

fn create_conversion_plans(
    paths: Vec<String>,
    target_format: ImageFormatConversionTarget,
) -> Result<Vec<ConversionPlan>, String> {
    if paths.is_empty() {
        return Err("변환할 이미지를 선택하세요.".to_string());
    }

    let mut target_paths = HashSet::new();
    let mut plans = Vec::with_capacity(paths.len());

    for path in paths {
        let source_path = PathBuf::from(path);

        if !source_path.is_file() {
            return Err(format!(
                "이미지 파일을 찾을 수 없습니다: {}",
                source_path.to_string_lossy()
            ));
        }

        if !has_supported_source_extension(&source_path) {
            return Err(format!(
                "지원하지 않는 이미지 파일입니다: {}",
                source_path.to_string_lossy()
            ));
        }

        let target_path = source_path.with_extension(target_format.extension());
        let target_key = target_path.to_string_lossy().to_lowercase();

        if !target_paths.insert(target_key) {
            return Err(format!(
                "변환 대상 파일명이 중복됩니다: {}",
                target_path.to_string_lossy()
            ));
        }

        if target_path != source_path && target_path.exists() {
            return Err(format!(
                "이미 같은 이름의 파일이 있습니다: {}",
                target_path.to_string_lossy()
            ));
        }

        plans.push(ConversionPlan {
            source_path,
            target_path,
        });
    }

    Ok(plans)
}

fn convert_image_file(
    source_path: &Path,
    target_path: &Path,
    target_format: ImageFormatConversionTarget,
) -> Result<(), String> {
    let temp_path = create_temp_path(target_path);

    if target_format == ImageFormatConversionTarget::Heic || is_heic_like_path(source_path) {
        convert_with_sips(source_path, &temp_path, target_format)?;
        replace_source_with_target(source_path, target_path, &temp_path)?;
        return Ok(());
    }

    let decoded_image = open_image(source_path)?;

    write_image(&decoded_image, &temp_path, target_format).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        format!(
            "이미지 변환 실패: {}: {error}",
            source_path.to_string_lossy()
        )
    })?;

    replace_source_with_target(source_path, target_path, &temp_path)
}

fn convert_with_sips(
    source_path: &Path,
    temp_path: &Path,
    target_format: ImageFormatConversionTarget,
) -> Result<(), String> {
    if target_format == ImageFormatConversionTarget::Webp {
        let intermediate_path = create_intermediate_png_path(temp_path);
        run_sips_conversion(
            source_path,
            &intermediate_path,
            ImageFormatConversionTarget::Png,
        )?;
        let decoded_image = open_image(&intermediate_path).map_err(|error| {
            let _ = fs::remove_file(&intermediate_path);
            error
        })?;
        let write_result =
            write_image(&decoded_image, temp_path, ImageFormatConversionTarget::Webp);
        let _ = fs::remove_file(&intermediate_path);

        return write_result.map_err(|error| {
            let _ = fs::remove_file(temp_path);
            format!(
                "이미지 변환 실패: {}: {error}",
                source_path.to_string_lossy()
            )
        });
    }

    run_sips_conversion(source_path, temp_path, target_format)
}

fn run_sips_conversion(
    source_path: &Path,
    temp_path: &Path,
    target_format: ImageFormatConversionTarget,
) -> Result<(), String> {
    let output = Command::new("sips")
        .arg("-s")
        .arg("format")
        .arg(target_format.sips_format())
        .arg(source_path)
        .arg("--out")
        .arg(temp_path)
        .output()
        .map_err(|error| format!("macOS 이미지 변환 도구 실행 실패: {error}"))?;

    if output.status.success() {
        return Ok(());
    }

    let _ = fs::remove_file(temp_path);
    let stderr = String::from_utf8_lossy(&output.stderr);

    Err(format!(
        "이미지 변환 실패: {}: {}",
        source_path.to_string_lossy(),
        stderr.trim()
    ))
}

fn open_image(source_path: &Path) -> Result<image::DynamicImage, String> {
    ImageReader::open(source_path)
        .map_err(|error| {
            format!(
                "이미지 열기 실패: {}: {error}",
                source_path.to_string_lossy()
            )
        })?
        .with_guessed_format()
        .map_err(|error| {
            format!(
                "이미지 형식 확인 실패: {}: {error}",
                source_path.to_string_lossy()
            )
        })?
        .decode()
        .map_err(|error| {
            format!(
                "이미지 해석 실패: {}: {error}",
                source_path.to_string_lossy()
            )
        })
}

fn write_image(
    decoded_image: &image::DynamicImage,
    temp_path: &Path,
    target_format: ImageFormatConversionTarget,
) -> image::ImageResult<()> {
    match target_format {
        ImageFormatConversionTarget::Png => {
            decoded_image.save_with_format(temp_path, ImageFormat::Png)
        }
        ImageFormatConversionTarget::Jpeg => {
            flatten_alpha_on_white(decoded_image).save_with_format(temp_path, ImageFormat::Jpeg)
        }
        ImageFormatConversionTarget::Heic => unreachable!("HEIC 변환은 sips로 처리합니다."),
        ImageFormatConversionTarget::Webp => {
            decoded_image.save_with_format(temp_path, ImageFormat::WebP)
        }
    }
}

fn replace_source_with_target(
    source_path: &Path,
    target_path: &Path,
    temp_path: &Path,
) -> Result<(), String> {
    if target_path == source_path {
        fs::rename(&temp_path, target_path).map_err(|error| {
            let _ = fs::remove_file(&temp_path);
            format!(
                "이미지 교체 실패: {}: {error}",
                target_path.to_string_lossy()
            )
        })?;
    } else {
        fs::remove_file(source_path).map_err(|error| {
            let _ = fs::remove_file(&temp_path);
            format!(
                "원본 이미지 삭제 실패: {}: {error}",
                source_path.to_string_lossy()
            )
        })?;
        fs::rename(&temp_path, target_path).map_err(|error| {
            let _ = fs::remove_file(&temp_path);
            format!(
                "이미지 이름 변경 실패: {}: {error}",
                target_path.to_string_lossy()
            )
        })?;
    }

    Ok(())
}

fn flatten_alpha_on_white(image: &image::DynamicImage) -> image::RgbImage {
    let rgba_image = image.to_rgba8();
    let (width, height) = rgba_image.dimensions();
    let mut rgb_image = image::RgbImage::new(width, height);

    for (x, y, pixel) in rgba_image.enumerate_pixels() {
        let [red, green, blue, alpha] = pixel.0;
        let alpha_ratio = alpha as f32 / 255.0;
        let flatten = |channel: u8| -> u8 {
            ((channel as f32 * alpha_ratio) + (255.0 * (1.0 - alpha_ratio))).round() as u8
        };

        rgb_image.put_pixel(
            x,
            y,
            image::Rgb([flatten(red), flatten(green), flatten(blue)]),
        );
    }

    rgb_image
}

fn create_temp_path(target_path: &Path) -> PathBuf {
    let extension = target_path
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or("tmp");
    let mut temp_path = target_path.to_path_buf();
    temp_path.set_extension(format!("worker-converting-{extension}"));
    temp_path
}

fn create_intermediate_png_path(target_path: &Path) -> PathBuf {
    let mut intermediate_path = target_path.to_path_buf();
    intermediate_path.set_extension("worker-intermediate-png");
    intermediate_path
}

fn has_supported_source_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            matches!(
                extension.to_ascii_lowercase().as_str(),
                "heic" | "heics" | "heif" | "jpeg" | "jpg" | "png" | "webp"
            )
        })
}

fn is_heic_like_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            matches!(
                extension.to_ascii_lowercase().as_str(),
                "heic" | "heics" | "heif"
            )
        })
}

impl ImageFormatConversionTarget {
    fn extension(self) -> &'static str {
        match self {
            ImageFormatConversionTarget::Png => "png",
            ImageFormatConversionTarget::Jpeg => "jpg",
            ImageFormatConversionTarget::Heic => "heic",
            ImageFormatConversionTarget::Webp => "webp",
        }
    }

    fn sips_format(self) -> &'static str {
        match self {
            ImageFormatConversionTarget::Png => "png",
            ImageFormatConversionTarget::Jpeg => "jpeg",
            ImageFormatConversionTarget::Heic => "heic",
            ImageFormatConversionTarget::Webp => {
                unreachable!("sips는 WebP 출력을 처리하지 않습니다.")
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{convert_image_formats, ImageFormatConversionTarget};
    use image::GenericImageView;
    use std::fs;

    fn temp_image_path(test_name: &str, extension: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "worker-image-format-{test_name}-{}.{extension}",
            std::process::id()
        ))
    }

    fn write_png(path: &std::path::Path) {
        let mut image = image::RgbaImage::new(1, 1);
        image.put_pixel(0, 0, image::Rgba([255, 0, 0, 255]));
        image
            .save_with_format(path, image::ImageFormat::Png)
            .unwrap();
    }

    fn write_jpeg(path: &std::path::Path) {
        let mut image = image::RgbImage::new(1, 1);
        image.put_pixel(0, 0, image::Rgb([0, 255, 0]));
        image
            .save_with_format(path, image::ImageFormat::Jpeg)
            .unwrap();
    }

    #[test]
    fn converts_png_to_jpeg_and_replaces_original_path() {
        let source_path = temp_image_path("png-to-jpeg", "png");
        let expected_path = source_path.with_extension("jpg");
        write_png(&source_path);
        let _ = fs::remove_file(&expected_path);

        let result = convert_image_formats(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Jpeg,
        )
        .unwrap();

        assert!(!source_path.exists());
        assert!(expected_path.exists());
        assert_eq!(result[0].output_path, expected_path.to_string_lossy());

        let converted = image::open(&expected_path).unwrap();
        assert_eq!(converted.dimensions(), (1, 1));

        fs::remove_file(expected_path).unwrap();
    }

    #[test]
    fn converts_multiple_png_files_to_jpeg() {
        let first_source_path = temp_image_path("multi-png-to-jpeg-first", "png");
        let second_source_path = temp_image_path("multi-png-to-jpeg-second", "png");
        let first_expected_path = first_source_path.with_extension("jpg");
        let second_expected_path = second_source_path.with_extension("jpg");
        write_png(&first_source_path);
        write_png(&second_source_path);
        let _ = fs::remove_file(&first_expected_path);
        let _ = fs::remove_file(&second_expected_path);

        let result = convert_image_formats(
            vec![
                first_source_path.to_string_lossy().to_string(),
                second_source_path.to_string_lossy().to_string(),
            ],
            ImageFormatConversionTarget::Jpeg,
        )
        .unwrap();

        assert!(!first_source_path.exists());
        assert!(!second_source_path.exists());
        assert!(first_expected_path.exists());
        assert!(second_expected_path.exists());
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].output_path, first_expected_path.to_string_lossy());
        assert_eq!(
            result[1].output_path,
            second_expected_path.to_string_lossy()
        );

        fs::remove_file(first_expected_path).unwrap();
        fs::remove_file(second_expected_path).unwrap();
    }

    #[test]
    fn rejects_existing_target_file_before_conversion() {
        let source_path = temp_image_path("collision", "png");
        let target_path = source_path.with_extension("jpg");
        write_png(&source_path);
        fs::write(&target_path, b"existing").unwrap();

        let result = convert_image_formats(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Jpeg,
        );

        assert_eq!(
            result.unwrap_err(),
            format!(
                "이미 같은 이름의 파일이 있습니다: {}",
                target_path.to_string_lossy()
            )
        );
        assert!(source_path.exists());
        assert_eq!(fs::read(&target_path).unwrap(), b"existing");

        fs::remove_file(source_path).unwrap();
        fs::remove_file(target_path).unwrap();
    }

    #[test]
    fn converts_jpeg_to_png_and_replaces_original_path() {
        let source_path = temp_image_path("jpeg-to-png", "jpeg");
        let expected_path = source_path.with_extension("png");
        write_jpeg(&source_path);
        let _ = fs::remove_file(&expected_path);

        let result = convert_image_formats(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Png,
        )
        .unwrap();

        assert!(!source_path.exists());
        assert!(expected_path.exists());
        assert_eq!(result[0].output_path, expected_path.to_string_lossy());

        let converted = image::open(&expected_path).unwrap();
        assert_eq!(converted.dimensions(), (1, 1));

        fs::remove_file(expected_path).unwrap();
    }

    #[test]
    fn converts_mislabeled_jpeg_with_png_extension_to_webp() {
        let source_path = temp_image_path("mislabeled-jpeg-to-webp", "png");
        let expected_path = source_path.with_extension("webp");
        write_jpeg(&source_path);
        let _ = fs::remove_file(&expected_path);

        let result = convert_image_formats(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Webp,
        )
        .unwrap();

        assert!(!source_path.exists());
        assert!(expected_path.exists());
        assert_eq!(result[0].output_path, expected_path.to_string_lossy());

        let converted = image::open(&expected_path).unwrap();
        assert_eq!(converted.dimensions(), (1, 1));

        fs::remove_file(expected_path).unwrap();
    }

    #[test]
    fn rejects_unsupported_extension() {
        let source_path = temp_image_path("unsupported", "txt");
        fs::write(&source_path, b"not image").unwrap();

        let result = convert_image_formats(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Png,
        );

        assert_eq!(
            result.unwrap_err(),
            format!(
                "지원하지 않는 이미지 파일입니다: {}",
                source_path.to_string_lossy()
            )
        );

        fs::remove_file(source_path).unwrap();
    }

    #[test]
    fn converts_png_to_webp_and_replaces_original_path() {
        let source_path = temp_image_path("png-to-webp", "png");
        let expected_path = source_path.with_extension("webp");
        write_png(&source_path);
        let _ = fs::remove_file(&expected_path);

        let result = convert_image_formats(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Webp,
        )
        .unwrap();

        assert!(!source_path.exists());
        assert!(expected_path.exists());
        assert_eq!(result[0].output_path, expected_path.to_string_lossy());

        let converted = image::open(&expected_path).unwrap();
        assert_eq!(converted.dimensions(), (1, 1));

        fs::remove_file(expected_path).unwrap();
    }

    #[test]
    fn accepts_heic_like_source_extensions() {
        assert!(super::has_supported_source_extension(std::path::Path::new(
            "photo.heic"
        )));
        assert!(super::has_supported_source_extension(std::path::Path::new(
            "photo.heif"
        )));
        assert!(super::has_supported_source_extension(std::path::Path::new(
            "photo.heics"
        )));
    }
}
