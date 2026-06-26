use image::{DynamicImage, ImageDecoder, ImageFormat, ImageReader};
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::{Read, Seek, SeekFrom};
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
    status: ConvertedImageFileStatus,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
enum ConvertedImageFileStatus {
    Converted,
    Skipped,
}

struct ConversionPlan {
    source_path: PathBuf,
    target_path: PathBuf,
    status: ConvertedImageFileStatus,
    source_format: SourceImageFormat,
}

struct PreparedConversion {
    source_path: PathBuf,
    target_path: PathBuf,
    temp_path: Option<PathBuf>,
    status: ConvertedImageFileStatus,
}

#[derive(Default)]
struct CommitRollback {
    created_targets: Vec<PathBuf>,
    backups: Vec<(PathBuf, PathBuf)>,
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum SourceImageFormat {
    Png,
    Jpeg,
    Heic,
    Webp,
    Other,
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum HeicSignatureKind {
    Still,
    Sequence,
}

#[tauri::command]
pub async fn convert_image_formats(
    paths: Vec<String>,
    target_format: ImageFormatConversionTarget,
) -> Result<Vec<ConvertedImageFile>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        convert_image_formats_blocking(paths, target_format)
    })
    .await
    .map_err(|error| format!("이미지 변환 작업 실패: {error}"))?
}

fn convert_image_formats_blocking(
    paths: Vec<String>,
    target_format: ImageFormatConversionTarget,
) -> Result<Vec<ConvertedImageFile>, String> {
    let plans = create_conversion_plans(paths, target_format)?;
    let prepared_conversions = prepare_conversions(plans, target_format)?;
    commit_prepared_conversions(&prepared_conversions)
}

fn commit_prepared_conversions(
    prepared_conversions: &[PreparedConversion],
) -> Result<Vec<ConvertedImageFile>, String> {
    let mut converted_files = Vec::with_capacity(prepared_conversions.len());
    let mut rollback = CommitRollback::default();

    for prepared_conversion in prepared_conversions {
        if let Err(error) = commit_prepared_conversion(prepared_conversion, &mut rollback) {
            rollback.restore();
            cleanup_prepared_conversions(prepared_conversions);
            return Err(error);
        }
        converted_files.push(ConvertedImageFile {
            original_path: prepared_conversion
                .source_path
                .to_string_lossy()
                .to_string(),
            output_path: prepared_conversion
                .target_path
                .to_string_lossy()
                .to_string(),
            status: prepared_conversion.status,
        });
    }

    if let Err(error) = finalize_prepared_conversions(prepared_conversions, &mut rollback) {
        rollback.restore();
        cleanup_prepared_conversions(prepared_conversions);
        return Err(error);
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

    let mut target_paths = Vec::with_capacity(paths.len());
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

        if has_heic_sequence_signature(&source_path)? {
            return Err(format!(
                "HEIC 시퀀스는 아직 변환을 지원하지 않습니다: {}",
                source_path.to_string_lossy()
            ));
        }

        let source_format = detect_source_format(&source_path)?;
        let already_target_format = source_format.matches_target(target_format)
            && has_target_extension(&source_path, target_format);
        if !already_target_format && is_animated_webp(&source_path)? {
            return Err(format!(
                "애니메이션 WebP는 아직 변환을 지원하지 않습니다: {}",
                source_path.to_string_lossy()
            ));
        }
        let target_path = if already_target_format {
            source_path.clone()
        } else {
            source_path.with_extension(target_format.extension())
        };
        if target_paths_conflict_with_existing_plan(&target_paths, &target_path)? {
            return Err(format!(
                "변환 대상 파일명이 중복됩니다: {}",
                target_path.to_string_lossy()
            ));
        }
        target_paths.push(target_path.clone());

        if target_path != source_path
            && target_path.exists()
            && !paths_differ_only_by_case_and_refer_to_same_existing_file(
                &source_path,
                &target_path,
            )
        {
            return Err(format!(
                "이미 같은 이름의 파일이 있습니다: {}",
                target_path.to_string_lossy()
            ));
        }

        plans.push(ConversionPlan {
            source_path,
            target_path,
            status: if already_target_format {
                ConvertedImageFileStatus::Skipped
            } else {
                ConvertedImageFileStatus::Converted
            },
            source_format,
        });
    }

    Ok(plans)
}

fn prepare_conversions(
    plans: Vec<ConversionPlan>,
    target_format: ImageFormatConversionTarget,
) -> Result<Vec<PreparedConversion>, String> {
    let mut prepared_conversions = Vec::with_capacity(plans.len());

    for plan in plans {
        match prepare_conversion(plan, target_format) {
            Ok(prepared_conversion) => prepared_conversions.push(prepared_conversion),
            Err(error) => {
                cleanup_prepared_conversions(&prepared_conversions);
                return Err(error);
            }
        }
    }

    Ok(prepared_conversions)
}

fn prepare_conversion(
    plan: ConversionPlan,
    target_format: ImageFormatConversionTarget,
) -> Result<PreparedConversion, String> {
    if plan.status == ConvertedImageFileStatus::Skipped {
        return Ok(PreparedConversion {
            source_path: plan.source_path,
            target_path: plan.target_path,
            temp_path: None,
            status: plan.status,
        });
    }

    let temp_path = create_unique_temp_path(&plan.target_path, "worker-converting")?;

    if target_format == ImageFormatConversionTarget::Heic
        || plan.source_format == SourceImageFormat::Heic
        || is_heic_like_path(&plan.source_path)
    {
        if let Err(error) = convert_with_sips(&plan.source_path, &temp_path, target_format) {
            let _ = fs::remove_file(&temp_path);
            return Err(error);
        }

        return Ok(PreparedConversion {
            source_path: plan.source_path,
            target_path: plan.target_path,
            temp_path: Some(temp_path),
            status: plan.status,
        });
    }

    let decoded_image = match open_image(&plan.source_path) {
        Ok(decoded_image) => decoded_image,
        Err(error) => {
            let _ = fs::remove_file(&temp_path);
            return Err(error);
        }
    };

    if let Err(error) = write_image(&decoded_image, &temp_path, target_format) {
        let _ = fs::remove_file(&temp_path);
        return Err(format!(
            "이미지 변환 실패: {}: {error}",
            plan.source_path.to_string_lossy()
        ));
    }

    Ok(PreparedConversion {
        source_path: plan.source_path,
        target_path: plan.target_path,
        temp_path: Some(temp_path),
        status: plan.status,
    })
}

fn convert_with_sips(
    source_path: &Path,
    temp_path: &Path,
    target_format: ImageFormatConversionTarget,
) -> Result<(), String> {
    if target_format == ImageFormatConversionTarget::Webp {
        let intermediate_path = create_unique_temp_path(temp_path, "worker-intermediate")?;
        if let Err(error) = run_sips_conversion(
            source_path,
            &intermediate_path,
            ImageFormatConversionTarget::Png,
        ) {
            let _ = fs::remove_file(&intermediate_path);
            return Err(error);
        }
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
    let mut decoder = ImageReader::open(source_path)
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
        .into_decoder()
        .map_err(|error| {
            format!(
                "이미지 해석 실패: {}: {error}",
                source_path.to_string_lossy()
            )
        })?;
    let orientation = decoder.orientation().map_err(|error| {
        format!(
            "이미지 방향 정보 확인 실패: {}: {error}",
            source_path.to_string_lossy()
        )
    })?;
    let mut decoded_image = DynamicImage::from_decoder(decoder).map_err(|error| {
        format!(
            "이미지 해석 실패: {}: {error}",
            source_path.to_string_lossy()
        )
    })?;
    decoded_image.apply_orientation(orientation);

    Ok(decoded_image)
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

fn commit_prepared_conversion(
    prepared_conversion: &PreparedConversion,
    rollback: &mut CommitRollback,
) -> Result<(), String> {
    let Some(temp_path) = prepared_conversion.temp_path.as_ref() else {
        return Ok(());
    };

    if prepared_conversion.target_path == prepared_conversion.source_path
        || paths_differ_only_by_case_and_refer_to_same_existing_file(
            &prepared_conversion.source_path,
            &prepared_conversion.target_path,
        )
    {
        let backup_path =
            create_unique_temp_path(&prepared_conversion.source_path, "worker-backup")?;
        let _ = fs::remove_file(&backup_path);
        fs::rename(&prepared_conversion.source_path, &backup_path).map_err(|error| {
            let _ = fs::remove_file(temp_path);
            format!(
                "원본 이미지 백업 실패: {}: {error}",
                prepared_conversion.source_path.to_string_lossy()
            )
        })?;
        fs::rename(temp_path, &prepared_conversion.target_path).map_err(|error| {
            let _ = fs::remove_file(temp_path);
            let _ = fs::rename(&backup_path, &prepared_conversion.source_path);
            format!(
                "이미지 교체 실패: {}: {error}",
                prepared_conversion.target_path.to_string_lossy()
            )
        })?;
        rollback
            .created_targets
            .push(prepared_conversion.target_path.clone());
        rollback
            .backups
            .push((prepared_conversion.source_path.clone(), backup_path));
    } else {
        copy_temp_to_target_without_overwrite(temp_path, &prepared_conversion.target_path)?;
        let backup_path =
            create_unique_temp_path(&prepared_conversion.source_path, "worker-backup")?;
        let _ = fs::remove_file(&backup_path);
        if let Err(error) = fs::rename(&prepared_conversion.source_path, &backup_path) {
            let _ = fs::remove_file(&prepared_conversion.target_path);
            return Err(format!(
                "원본 이미지 백업 실패: {}: {error}",
                prepared_conversion.source_path.to_string_lossy()
            ));
        }
        rollback
            .created_targets
            .push(prepared_conversion.target_path.clone());
        rollback
            .backups
            .push((prepared_conversion.source_path.clone(), backup_path));
    }

    Ok(())
}

fn finalize_prepared_conversions(
    prepared_conversions: &[PreparedConversion],
    rollback: &mut CommitRollback,
) -> Result<(), String> {
    for prepared_conversion in prepared_conversions {
        if let Some(temp_path) = prepared_conversion.temp_path.as_ref() {
            let _ = fs::remove_file(temp_path);
        }
    }

    rollback.remove_backups()
}

fn copy_temp_to_target_without_overwrite(
    temp_path: &Path,
    target_path: &Path,
) -> Result<(), String> {
    let mut temp_file = fs::File::open(temp_path).map_err(|error| {
        format!(
            "임시 이미지 열기 실패: {}: {error}",
            temp_path.to_string_lossy()
        )
    })?;
    let mut target_file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(target_path)
        .map_err(|error| {
            if target_path.exists() {
                format!(
                    "이미 같은 이름의 파일이 있습니다: {}",
                    target_path.to_string_lossy()
                )
            } else {
                format!(
                    "이미지 이름 변경 실패: {}: {error}",
                    target_path.to_string_lossy()
                )
            }
        })?;

    if let Err(error) = std::io::copy(&mut temp_file, &mut target_file) {
        let _ = fs::remove_file(target_path);
        return Err(format!(
            "이미지 파일 복사 실패: {}: {error}",
            target_path.to_string_lossy()
        ));
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

fn create_unique_temp_path(target_path: &Path, marker: &str) -> Result<PathBuf, String> {
    let extension = target_path
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or("tmp");
    let file_stem = target_path
        .file_stem()
        .and_then(|file_stem| file_stem.to_str())
        .unwrap_or("image");
    let directory = target_path.parent().unwrap_or_else(|| Path::new("."));

    for attempt in 0..100 {
        let temp_path = directory.join(format!(
            ".{file_stem}.{marker}-{}-{attempt}.{extension}",
            std::process::id()
        ));

        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp_path)
        {
            Ok(_) => return Ok(temp_path),
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => {
                return Err(format!(
                    "임시 파일 생성 실패: {}: {error}",
                    temp_path.to_string_lossy()
                ));
            }
        }
    }

    Err(format!(
        "충돌하지 않는 임시 파일명을 만들 수 없습니다: {}",
        target_path.to_string_lossy()
    ))
}

fn cleanup_prepared_conversions(prepared_conversions: &[PreparedConversion]) {
    for prepared_conversion in prepared_conversions {
        if let Some(temp_path) = prepared_conversion.temp_path.as_ref() {
            let _ = fs::remove_file(temp_path);
        }
    }
}

fn has_supported_source_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            matches!(
                extension.to_ascii_lowercase().as_str(),
                "heic" | "heif" | "jpeg" | "jpg" | "png" | "webp"
            )
        })
}

fn is_heic_like_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| matches!(extension.to_ascii_lowercase().as_str(), "heic" | "heif"))
}

fn has_target_extension(path: &Path, target_format: ImageFormatConversionTarget) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            let extension = extension.to_ascii_lowercase();
            match target_format {
                ImageFormatConversionTarget::Png => extension == "png",
                ImageFormatConversionTarget::Jpeg => extension == "jpg" || extension == "jpeg",
                ImageFormatConversionTarget::Heic => extension == "heic",
                ImageFormatConversionTarget::Webp => extension == "webp",
            }
        })
}

fn target_paths_conflict_with_existing_plan(
    existing_target_paths: &[PathBuf],
    target_path: &Path,
) -> Result<bool, String> {
    for existing_target_path in existing_target_paths {
        if existing_target_path == target_path {
            return Ok(true);
        }

        if paths_are_case_equivalent(existing_target_path, target_path)
            && is_case_insensitive_directory(
                target_path.parent().unwrap_or_else(|| Path::new(".")),
            )?
        {
            return Ok(true);
        }
    }

    Ok(false)
}

fn paths_differ_only_by_case_and_refer_to_same_existing_file(
    first_path: &Path,
    second_path: &Path,
) -> bool {
    if !paths_are_case_equivalent(first_path, second_path) {
        return false;
    }

    let Ok(first_metadata) = fs::metadata(first_path) else {
        return false;
    };
    let Ok(second_metadata) = fs::metadata(second_path) else {
        return false;
    };

    same_file_metadata(&first_metadata, &second_metadata)
}

fn paths_are_case_equivalent(first_path: &Path, second_path: &Path) -> bool {
    first_path != second_path
        && first_path
            .to_string_lossy()
            .eq_ignore_ascii_case(&second_path.to_string_lossy())
}

fn is_case_insensitive_directory(directory: &Path) -> Result<bool, String> {
    for attempt in 0..100 {
        let probe_name = format!(".worker-case-check-{}-{attempt}.tmp", std::process::id());
        let probe_path = directory.join(&probe_name);

        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&probe_path)
        {
            Ok(_) => {
                let toggled_path = directory.join(toggle_ascii_case(&probe_name));
                let is_case_insensitive = toggled_path.exists();
                let _ = fs::remove_file(&probe_path);
                return Ok(is_case_insensitive);
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => {
                return Err(format!(
                    "파일시스템 대소문자 확인 실패: {}: {error}",
                    directory.to_string_lossy()
                ));
            }
        }
    }

    Err(format!(
        "파일시스템 대소문자 확인용 임시 파일을 만들 수 없습니다: {}",
        directory.to_string_lossy()
    ))
}

fn toggle_ascii_case(value: &str) -> String {
    value
        .chars()
        .map(|character| {
            if character.is_ascii_lowercase() {
                character.to_ascii_uppercase()
            } else if character.is_ascii_uppercase() {
                character.to_ascii_lowercase()
            } else {
                character
            }
        })
        .collect()
}

#[cfg(unix)]
fn same_file_metadata(first_metadata: &fs::Metadata, second_metadata: &fs::Metadata) -> bool {
    use std::os::unix::fs::MetadataExt;

    first_metadata.dev() == second_metadata.dev() && first_metadata.ino() == second_metadata.ino()
}

#[cfg(not(unix))]
fn same_file_metadata(_first_metadata: &fs::Metadata, _second_metadata: &fs::Metadata) -> bool {
    false
}

fn detect_source_format(path: &Path) -> Result<SourceImageFormat, String> {
    if detect_heic_signature(path)? == Some(HeicSignatureKind::Still) {
        return Ok(SourceImageFormat::Heic);
    }

    let mut file = fs::File::open(path)
        .map_err(|error| format!("이미지 파일 읽기 실패: {}: {error}", path.to_string_lossy()))?;
    let mut header = [0; 64];
    let bytes_read = file
        .read(&mut header)
        .map_err(|error| format!("이미지 파일 읽기 실패: {}: {error}", path.to_string_lossy()))?;

    Ok(match image::guess_format(&header[..bytes_read]) {
        Ok(ImageFormat::Png) => SourceImageFormat::Png,
        Ok(ImageFormat::Jpeg) => SourceImageFormat::Jpeg,
        Ok(ImageFormat::WebP) => SourceImageFormat::Webp,
        _ => SourceImageFormat::Other,
    })
}

fn has_heic_sequence_signature(path: &Path) -> Result<bool, String> {
    Ok(detect_heic_signature(path)? == Some(HeicSignatureKind::Sequence))
}

fn detect_heic_signature(path: &Path) -> Result<Option<HeicSignatureKind>, String> {
    let mut file = fs::File::open(path)
        .map_err(|error| format!("이미지 파일 읽기 실패: {}: {error}", path.to_string_lossy()))?;
    let mut header = [0; 64];
    let bytes_read = file
        .read(&mut header)
        .map_err(|error| format!("이미지 파일 읽기 실패: {}: {error}", path.to_string_lossy()))?;

    if bytes_read < 12 || &header[4..8] != b"ftyp" {
        return Ok(None);
    }

    let mut has_still_brand = false;
    for brand in header[8..bytes_read].chunks_exact(4) {
        if matches!(brand, b"hevc" | b"hevx" | b"msf1") {
            return Ok(Some(HeicSignatureKind::Sequence));
        }

        if matches!(brand, b"heic" | b"heix" | b"heif" | b"mif1") {
            has_still_brand = true;
        }
    }

    Ok(has_still_brand.then_some(HeicSignatureKind::Still))
}

fn is_animated_webp(path: &Path) -> Result<bool, String> {
    let mut file = fs::File::open(path)
        .map_err(|error| format!("이미지 파일 읽기 실패: {}: {error}", path.to_string_lossy()))?;
    let mut header = [0; 12];

    if file.read_exact(&mut header).is_err() {
        return Ok(false);
    }

    if &header[0..4] != b"RIFF" || &header[8..12] != b"WEBP" {
        return Ok(false);
    }

    loop {
        let mut chunk_header = [0; 8];
        if file.read_exact(&mut chunk_header).is_err() {
            return Ok(false);
        }

        let chunk_type = &chunk_header[0..4];
        let chunk_size = u32::from_le_bytes([
            chunk_header[4],
            chunk_header[5],
            chunk_header[6],
            chunk_header[7],
        ]);

        if chunk_type == b"ANIM" {
            return Ok(true);
        }

        if chunk_type == b"VP8X" && chunk_size > 0 {
            let mut flags = [0; 1];
            if file.read_exact(&mut flags).is_err() {
                return Ok(false);
            }

            return Ok(flags[0] & 0x02 != 0);
        }

        let padded_size = chunk_size + (chunk_size % 2);
        if file
            .seek(SeekFrom::Current(i64::from(padded_size)))
            .is_err()
        {
            return Ok(false);
        }
    }
}

impl SourceImageFormat {
    fn matches_target(self, target_format: ImageFormatConversionTarget) -> bool {
        matches!(
            (self, target_format),
            (SourceImageFormat::Png, ImageFormatConversionTarget::Png)
                | (SourceImageFormat::Jpeg, ImageFormatConversionTarget::Jpeg)
                | (SourceImageFormat::Heic, ImageFormatConversionTarget::Heic)
                | (SourceImageFormat::Webp, ImageFormatConversionTarget::Webp)
        )
    }
}

impl CommitRollback {
    fn restore(&mut self) {
        for target_path in self.created_targets.iter().rev() {
            let _ = fs::remove_file(target_path);
        }

        for (source_path, backup_path) in self.backups.iter().rev() {
            if backup_path.exists() {
                let _ = fs::rename(backup_path, source_path);
            }
        }
    }

    fn remove_backups(&mut self) -> Result<(), String> {
        for (_, backup_path) in &self.backups {
            fs::remove_file(backup_path).map_err(|error| {
                format!(
                    "원본 이미지 백업 삭제 실패: {}: {error}",
                    backup_path.to_string_lossy()
                )
            })?;
        }

        self.backups.clear();
        self.created_targets.clear();
        Ok(())
    }
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
    use super::{
        convert_image_formats_blocking, ConvertedImageFileStatus, ImageFormatConversionTarget,
    };
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

    fn write_fake_heic_signature(path: &std::path::Path) {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&24u32.to_be_bytes());
        bytes.extend_from_slice(b"ftyp");
        bytes.extend_from_slice(b"heic");
        bytes.extend_from_slice(&[0; 4]);
        bytes.extend_from_slice(b"mif1");
        bytes.extend_from_slice(b"heic");
        fs::write(path, bytes).unwrap();
    }

    fn write_fake_heic_sequence_signature(path: &std::path::Path) {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&24u32.to_be_bytes());
        bytes.extend_from_slice(b"ftyp");
        bytes.extend_from_slice(b"hevc");
        bytes.extend_from_slice(&[0; 4]);
        bytes.extend_from_slice(b"msf1");
        bytes.extend_from_slice(b"hevc");
        fs::write(path, bytes).unwrap();
    }

    #[test]
    fn converts_png_to_jpeg_and_replaces_original_path() {
        let source_path = temp_image_path("png-to-jpeg", "png");
        let expected_path = source_path.with_extension("jpg");
        write_png(&source_path);
        let _ = fs::remove_file(&expected_path);

        let result = convert_image_formats_blocking(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Jpeg,
        )
        .unwrap();

        assert!(!source_path.exists());
        assert!(expected_path.exists());
        assert_eq!(result[0].output_path, expected_path.to_string_lossy());
        assert_eq!(result[0].status, ConvertedImageFileStatus::Converted);

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

        let result = convert_image_formats_blocking(
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
        assert_eq!(result[0].status, ConvertedImageFileStatus::Converted);
        assert_eq!(result[1].status, ConvertedImageFileStatus::Converted);
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

        let result = convert_image_formats_blocking(
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
    fn converts_when_target_differs_only_by_extension_case_on_case_insensitive_filesystem() {
        let source_path = temp_image_path("case-only-target", "JPG");
        let target_path = source_path.with_extension("jpg");
        write_png(&source_path);

        if !target_path.exists() {
            fs::remove_file(source_path).unwrap();
            return;
        }

        let result = convert_image_formats_blocking(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Jpeg,
        )
        .unwrap();

        assert!(target_path.exists());
        assert_eq!(result[0].output_path, target_path.to_string_lossy());
        assert_eq!(result[0].status, ConvertedImageFileStatus::Converted);

        let converted = image::open(&target_path).unwrap();
        assert_eq!(converted.dimensions(), (1, 1));

        fs::remove_file(target_path).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn rejects_existing_target_hardlink_that_is_not_case_only_rename() {
        let source_path = temp_image_path("hardlink-source", "png");
        let target_path = source_path.with_extension("jpg");
        write_png(&source_path);
        let _ = fs::remove_file(&target_path);
        fs::hard_link(&source_path, &target_path).unwrap();

        let result = convert_image_formats_blocking(
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
        assert!(target_path.exists());

        fs::remove_file(source_path).unwrap();
        fs::remove_file(target_path).unwrap();
    }

    #[test]
    fn accepts_case_distinct_targets_on_case_sensitive_filesystem() {
        let first_source_path = std::env::temp_dir().join(format!(
            "worker-image-format-case-sensitive-{}-Photo.png",
            std::process::id()
        ));
        let second_source_path = std::env::temp_dir().join(format!(
            "worker-image-format-case-sensitive-{}-photo.png",
            std::process::id()
        ));
        let first_expected_path = first_source_path.with_extension("jpg");
        let second_expected_path = second_source_path.with_extension("jpg");
        let _ = fs::remove_file(&first_source_path);
        let _ = fs::remove_file(&second_source_path);
        let _ = fs::remove_file(&first_expected_path);
        let _ = fs::remove_file(&second_expected_path);

        write_png(&first_source_path);
        if second_source_path.exists() {
            fs::remove_file(first_source_path).unwrap();
            return;
        }
        write_png(&second_source_path);

        let result = convert_image_formats_blocking(
            vec![
                first_source_path.to_string_lossy().to_string(),
                second_source_path.to_string_lossy().to_string(),
            ],
            ImageFormatConversionTarget::Jpeg,
        )
        .unwrap();

        assert_eq!(result.len(), 2);
        assert!(first_expected_path.exists());
        assert!(second_expected_path.exists());

        fs::remove_file(first_expected_path).unwrap();
        fs::remove_file(second_expected_path).unwrap();
    }

    #[test]
    fn keeps_source_files_when_later_file_fails_during_batch_prepare() {
        let first_source_path = temp_image_path("batch-failure-first", "png");
        let second_source_path = temp_image_path("batch-failure-second", "png");
        let first_expected_path = first_source_path.with_extension("jpg");
        write_png(&first_source_path);
        fs::write(&second_source_path, b"not a decodable image").unwrap();
        let _ = fs::remove_file(&first_expected_path);

        let result = convert_image_formats_blocking(
            vec![
                first_source_path.to_string_lossy().to_string(),
                second_source_path.to_string_lossy().to_string(),
            ],
            ImageFormatConversionTarget::Jpeg,
        );

        assert!(result.is_err());
        assert!(first_source_path.exists());
        assert!(second_source_path.exists());
        assert!(!first_expected_path.exists());

        fs::remove_file(first_source_path).unwrap();
        fs::remove_file(second_source_path).unwrap();
    }

    #[test]
    fn converts_jpeg_to_png_and_replaces_original_path() {
        let source_path = temp_image_path("jpeg-to-png", "jpeg");
        let expected_path = source_path.with_extension("png");
        write_jpeg(&source_path);
        let _ = fs::remove_file(&expected_path);

        let result = convert_image_formats_blocking(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Png,
        )
        .unwrap();

        assert!(!source_path.exists());
        assert!(expected_path.exists());
        assert_eq!(result[0].output_path, expected_path.to_string_lossy());
        assert_eq!(result[0].status, ConvertedImageFileStatus::Converted);

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

        let result = convert_image_formats_blocking(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Webp,
        )
        .unwrap();

        assert!(!source_path.exists());
        assert!(expected_path.exists());
        assert_eq!(result[0].output_path, expected_path.to_string_lossy());
        assert_eq!(result[0].status, ConvertedImageFileStatus::Converted);

        let converted = image::open(&expected_path).unwrap();
        assert_eq!(converted.dimensions(), (1, 1));

        fs::remove_file(expected_path).unwrap();
    }

    #[test]
    fn rejects_unsupported_extension() {
        let source_path = temp_image_path("unsupported", "txt");
        fs::write(&source_path, b"not image").unwrap();

        let result = convert_image_formats_blocking(
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

        let result = convert_image_formats_blocking(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Webp,
        )
        .unwrap();

        assert!(!source_path.exists());
        assert!(expected_path.exists());
        assert_eq!(result[0].output_path, expected_path.to_string_lossy());
        assert_eq!(result[0].status, ConvertedImageFileStatus::Converted);

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
        assert!(!super::has_supported_source_extension(
            std::path::Path::new("photo.heics")
        ));
    }

    #[test]
    fn detects_mislabeled_heic_signature() {
        let source_path = temp_image_path("mislabeled-heic-signature", "jpg");
        write_fake_heic_signature(&source_path);

        assert_eq!(
            super::detect_source_format(&source_path).unwrap(),
            super::SourceImageFormat::Heic
        );

        fs::remove_file(source_path).unwrap();
    }

    #[test]
    fn rejects_heic_sequence_signature() {
        let source_path = temp_image_path("heic-sequence-signature", "heic");
        write_fake_heic_sequence_signature(&source_path);

        let result = convert_image_formats_blocking(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Jpeg,
        );

        assert_eq!(
            result.unwrap_err(),
            format!(
                "HEIC 시퀀스는 아직 변환을 지원하지 않습니다: {}",
                source_path.to_string_lossy()
            )
        );
        assert!(source_path.exists());

        fs::remove_file(source_path).unwrap();
    }

    #[test]
    fn does_not_skip_mislabeled_heic_when_target_is_jpeg() {
        let source_path = temp_image_path("mislabeled-heic-plan", "jpg");
        write_fake_heic_signature(&source_path);

        let plans = super::create_conversion_plans(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Jpeg,
        )
        .unwrap();

        assert_eq!(plans[0].source_format, super::SourceImageFormat::Heic);
        assert_eq!(plans[0].status, ConvertedImageFileStatus::Converted);
        assert_eq!(plans[0].target_path, source_path);

        fs::remove_file(source_path).unwrap();
    }

    #[test]
    fn does_not_skip_jpeg_with_heic_extension_when_target_is_heic() {
        let source_path = temp_image_path("mislabeled-jpeg-plan", "heic");
        write_jpeg(&source_path);

        let plans = super::create_conversion_plans(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Heic,
        )
        .unwrap();

        assert_eq!(plans[0].source_format, super::SourceImageFormat::Jpeg);
        assert_eq!(plans[0].status, ConvertedImageFileStatus::Converted);
        assert_eq!(plans[0].target_path, source_path);

        fs::remove_file(source_path).unwrap();
    }

    #[test]
    fn skips_jpg_when_target_is_jpeg_without_reencoding() {
        let source_path = temp_image_path("jpg-to-jpeg-skip", "jpg");
        write_jpeg(&source_path);
        let original_bytes = fs::read(&source_path).unwrap();

        let result = convert_image_formats_blocking(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Jpeg,
        )
        .unwrap();

        assert!(source_path.exists());
        assert_eq!(fs::read(&source_path).unwrap(), original_bytes);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].output_path, source_path.to_string_lossy());
        assert_eq!(result[0].status, ConvertedImageFileStatus::Skipped);

        fs::remove_file(source_path).unwrap();
    }

    #[test]
    fn skips_jpeg_extension_when_target_is_jpeg_without_reencoding() {
        let source_path = temp_image_path("jpeg-to-jpeg-skip", "jpeg");
        write_jpeg(&source_path);
        let original_bytes = fs::read(&source_path).unwrap();

        let result = convert_image_formats_blocking(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Jpeg,
        )
        .unwrap();

        assert!(source_path.exists());
        assert_eq!(fs::read(&source_path).unwrap(), original_bytes);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].output_path, source_path.to_string_lossy());
        assert_eq!(result[0].status, ConvertedImageFileStatus::Skipped);

        fs::remove_file(source_path).unwrap();
    }

    #[test]
    fn rejects_animated_webp_before_decoding() {
        let source_path = temp_image_path("animated-webp", "webp");
        let mut bytes = Vec::new();
        bytes.extend_from_slice(b"RIFF");
        bytes.extend_from_slice(&18u32.to_le_bytes());
        bytes.extend_from_slice(b"WEBP");
        bytes.extend_from_slice(b"VP8X");
        bytes.extend_from_slice(&10u32.to_le_bytes());
        bytes.push(0x02);
        bytes.extend_from_slice(&[0; 9]);
        fs::write(&source_path, bytes).unwrap();

        let result = convert_image_formats_blocking(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Png,
        );

        assert_eq!(
            result.unwrap_err(),
            format!(
                "애니메이션 WebP는 아직 변환을 지원하지 않습니다: {}",
                source_path.to_string_lossy()
            )
        );
        assert!(source_path.exists());

        fs::remove_file(source_path).unwrap();
    }

    #[test]
    fn skips_animated_webp_when_target_is_webp() {
        let source_path = temp_image_path("animated-webp-skip", "webp");
        let mut bytes = Vec::new();
        bytes.extend_from_slice(b"RIFF");
        bytes.extend_from_slice(&18u32.to_le_bytes());
        bytes.extend_from_slice(b"WEBP");
        bytes.extend_from_slice(b"VP8X");
        bytes.extend_from_slice(&10u32.to_le_bytes());
        bytes.push(0x02);
        bytes.extend_from_slice(&[0; 9]);
        fs::write(&source_path, &bytes).unwrap();

        let result = convert_image_formats_blocking(
            vec![source_path.to_string_lossy().to_string()],
            ImageFormatConversionTarget::Webp,
        )
        .unwrap();

        assert_eq!(fs::read(&source_path).unwrap(), bytes);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].output_path, source_path.to_string_lossy());
        assert_eq!(result[0].status, ConvertedImageFileStatus::Skipped);

        fs::remove_file(source_path).unwrap();
    }

    #[test]
    fn cleans_intermediate_file_when_heic_to_webp_prepare_fails() {
        let source_path = temp_image_path("heic-webp-failure-source", "heic");
        let temp_path = temp_image_path("heic-webp-failure-target", "webp");
        let parent = temp_path.parent().unwrap();
        let stem = temp_path.file_stem().unwrap().to_string_lossy();
        write_fake_heic_signature(&source_path);
        let _ = fs::remove_file(&temp_path);

        let result =
            super::convert_with_sips(&source_path, &temp_path, ImageFormatConversionTarget::Webp);

        assert!(result.is_err());
        let leaked_intermediate = fs::read_dir(parent)
            .unwrap()
            .filter_map(Result::ok)
            .map(|entry| entry.file_name().to_string_lossy().to_string())
            .any(|file_name| {
                file_name.contains(stem.as_ref()) && file_name.contains(".worker-intermediate-")
            });
        assert!(!leaked_intermediate);

        let _ = fs::remove_file(source_path);
        let _ = fs::remove_file(temp_path);
    }

    #[test]
    fn cleans_remaining_temp_files_when_commit_fails() {
        let first_source_path = temp_image_path("commit-failure-first-source", "png");
        let first_target_path = temp_image_path("commit-failure-first-target", "jpg");
        let first_temp_path = temp_image_path("commit-failure-first-temp", "jpg");
        let second_source_path = temp_image_path("commit-failure-second-source", "png");
        let second_target_path = temp_image_path("commit-failure-second-target", "jpg");
        let second_temp_path = temp_image_path("commit-failure-second-temp", "jpg");

        write_png(&first_source_path);
        write_png(&second_source_path);
        fs::write(&first_temp_path, b"first temp").unwrap();
        fs::write(&second_temp_path, b"second temp").unwrap();
        fs::create_dir(&first_target_path).unwrap();
        let _ = fs::remove_file(&second_target_path);

        let prepared_conversions = vec![
            super::PreparedConversion {
                source_path: first_source_path.clone(),
                target_path: first_target_path.clone(),
                temp_path: Some(first_temp_path.clone()),
                status: ConvertedImageFileStatus::Converted,
            },
            super::PreparedConversion {
                source_path: second_source_path.clone(),
                target_path: second_target_path.clone(),
                temp_path: Some(second_temp_path.clone()),
                status: ConvertedImageFileStatus::Converted,
            },
        ];

        let result = super::commit_prepared_conversions(&prepared_conversions);

        assert!(result.is_err());
        assert!(!first_temp_path.exists());
        assert!(!second_temp_path.exists());
        assert!(first_source_path.exists());
        assert!(second_source_path.exists());
        assert!(!second_target_path.exists());

        fs::remove_file(first_source_path).unwrap();
        fs::remove_file(second_source_path).unwrap();
        fs::remove_dir(first_target_path).unwrap();
    }

    #[test]
    fn rolls_back_committed_targets_when_later_commit_fails() {
        let first_source_path = temp_image_path("rollback-first-source", "png");
        let first_target_path = temp_image_path("rollback-first-target", "jpg");
        let first_temp_path = temp_image_path("rollback-first-temp", "jpg");
        let second_source_path = temp_image_path("rollback-second-source", "png");
        let second_target_path = temp_image_path("rollback-second-target", "jpg");
        let second_temp_path = temp_image_path("rollback-second-temp", "jpg");

        write_png(&first_source_path);
        write_png(&second_source_path);
        fs::write(&first_temp_path, b"first converted").unwrap();
        fs::write(&second_temp_path, b"second converted").unwrap();
        let _ = fs::remove_file(&first_target_path);
        fs::create_dir(&second_target_path).unwrap();

        let prepared_conversions = vec![
            super::PreparedConversion {
                source_path: first_source_path.clone(),
                target_path: first_target_path.clone(),
                temp_path: Some(first_temp_path.clone()),
                status: ConvertedImageFileStatus::Converted,
            },
            super::PreparedConversion {
                source_path: second_source_path.clone(),
                target_path: second_target_path.clone(),
                temp_path: Some(second_temp_path.clone()),
                status: ConvertedImageFileStatus::Converted,
            },
        ];

        let result = super::commit_prepared_conversions(&prepared_conversions);

        assert!(result.is_err());
        assert!(first_source_path.exists());
        assert!(second_source_path.exists());
        assert!(!first_target_path.exists());
        assert!(!first_temp_path.exists());
        assert!(!second_temp_path.exists());

        fs::remove_file(first_source_path).unwrap();
        fs::remove_file(second_source_path).unwrap();
        fs::remove_dir(second_target_path).unwrap();
    }

    #[test]
    fn restores_same_path_source_when_later_commit_fails() {
        let first_source_path = temp_image_path("rollback-same-source", "jpg");
        let first_temp_path = temp_image_path("rollback-same-temp", "jpg");
        let second_source_path = temp_image_path("rollback-same-second-source", "png");
        let second_target_path = temp_image_path("rollback-same-second-target", "jpg");
        let second_temp_path = temp_image_path("rollback-same-second-temp", "jpg");

        fs::write(&first_source_path, b"original same path").unwrap();
        fs::write(&first_temp_path, b"converted same path").unwrap();
        write_png(&second_source_path);
        fs::write(&second_temp_path, b"second converted").unwrap();
        fs::create_dir(&second_target_path).unwrap();

        let prepared_conversions = vec![
            super::PreparedConversion {
                source_path: first_source_path.clone(),
                target_path: first_source_path.clone(),
                temp_path: Some(first_temp_path.clone()),
                status: ConvertedImageFileStatus::Converted,
            },
            super::PreparedConversion {
                source_path: second_source_path.clone(),
                target_path: second_target_path.clone(),
                temp_path: Some(second_temp_path.clone()),
                status: ConvertedImageFileStatus::Converted,
            },
        ];

        let result = super::commit_prepared_conversions(&prepared_conversions);

        assert!(result.is_err());
        assert_eq!(fs::read(&first_source_path).unwrap(), b"original same path");
        assert!(second_source_path.exists());
        assert!(!first_temp_path.exists());
        assert!(!second_temp_path.exists());

        fs::remove_file(first_source_path).unwrap();
        fs::remove_file(second_source_path).unwrap();
        fs::remove_dir(second_target_path).unwrap();
    }

    #[test]
    fn does_not_overwrite_target_created_after_prepare() {
        let source_path = temp_image_path("commit-race-source", "png");
        let target_path = temp_image_path("commit-race-target", "jpg");
        let temp_path = temp_image_path("commit-race-temp", "jpg");
        write_png(&source_path);
        fs::write(&target_path, b"existing target").unwrap();
        fs::write(&temp_path, b"converted temp").unwrap();

        let prepared_conversion = super::PreparedConversion {
            source_path: source_path.clone(),
            target_path: target_path.clone(),
            temp_path: Some(temp_path.clone()),
            status: ConvertedImageFileStatus::Converted,
        };

        let result = super::commit_prepared_conversions(&[prepared_conversion]);

        assert_eq!(
            result.unwrap_err(),
            format!(
                "이미 같은 이름의 파일이 있습니다: {}",
                target_path.to_string_lossy()
            )
        );
        assert!(source_path.exists());
        assert_eq!(fs::read(&target_path).unwrap(), b"existing target");
        assert!(!temp_path.exists());

        fs::remove_file(source_path).unwrap();
        fs::remove_file(target_path).unwrap();
    }

    #[test]
    fn creates_unique_temp_path_without_overwriting_existing_file() {
        let target_path = temp_image_path("temp-collision", "jpg");
        let file_stem = target_path.file_stem().unwrap().to_string_lossy();
        let collision_path = target_path.with_file_name(format!(
            ".{file_stem}.worker-converting-{}-0.jpg",
            std::process::id()
        ));
        fs::write(&collision_path, b"existing temp").unwrap();

        let temp_path = super::create_unique_temp_path(&target_path, "worker-converting").unwrap();

        assert_ne!(temp_path, collision_path);
        assert_eq!(fs::read(&collision_path).unwrap(), b"existing temp");
        assert!(temp_path.exists());

        fs::remove_file(collision_path).unwrap();
        fs::remove_file(temp_path).unwrap();
    }
}
