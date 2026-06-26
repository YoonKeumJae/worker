import { useState } from "react";
import {
  convertImageFormats,
  getImageFileName,
  type ImageFormatConversionTarget,
  selectImageFiles,
} from "./imageFormatConversion";

type ConversionStatusPhase =
  | "selecting"
  | "converting"
  | "converted"
  | "cancelled"
  | "failed";

type ConversionStatus = {
  phase: ConversionStatusPhase;
  message: string;
};

const targetFormatLabels: Record<ImageFormatConversionTarget, string> = {
  png: "PNG",
  jpeg: "JPG",
  heic: "HEIC",
  webp: "WebP",
};

export function ImageFormatConverterTool() {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [targetFormat, setTargetFormat] =
    useState<ImageFormatConversionTarget>("png");
  const [status, setStatus] = useState<ConversionStatus | null>(null);
  const [hasConfirmedReplacement, setHasConfirmedReplacement] = useState(false);

  const isProcessing =
    status?.phase === "selecting" || status?.phase === "converting";
  const canConvert =
    selectedPaths.length > 0 && hasConfirmedReplacement && !isProcessing;
  const statusRole =
    status?.phase === "failed" ? "alert" : status === null ? undefined : "status";

  async function handleSelectImages() {
    if (isProcessing) {
      return;
    }

    setStatus({ phase: "selecting", message: "이미지 선택 중..." });

    try {
      const nextSelectedPaths = await selectImageFiles();

      if (nextSelectedPaths.length === 0) {
        setStatus({ phase: "cancelled", message: "이미지 선택 취소." });
        return;
      }

      setSelectedPaths(nextSelectedPaths);
      setHasConfirmedReplacement(false);
      setStatus(null);
    } catch {
      setStatus({
        phase: "failed",
        message: "이미지 선택 실패. 다시 시도하세요.",
      });
    }
  }

  async function handleConvertImages() {
    if (!canConvert) {
      return;
    }

    setStatus({ phase: "converting", message: "이미지 변환 중..." });

    try {
      const convertedFiles = await convertImageFormats(selectedPaths, targetFormat);
      setSelectedPaths(convertedFiles.map((file) => file.outputPath));
      setHasConfirmedReplacement(false);
      setStatus({
        phase: "converted",
        message: `${convertedFiles.length}개 이미지 변환 완료.`,
      });
    } catch (error) {
      setStatus({
        phase: "failed",
        message: getConversionErrorMessage(error),
      });
    }
  }

  function handleTargetFormatChange(nextTargetFormat: ImageFormatConversionTarget) {
    setTargetFormat(nextTargetFormat);
    setHasConfirmedReplacement(false);
    setStatus(null);
  }

  return (
    <div className="image-format-tool">
      <section
        className="image-format-panel"
        aria-labelledby="current-tool-title"
      >
        <div className="qr-heading">
          <p className="tool-kicker">이미지 포맷 변환</p>
          <h1 id="current-tool-title">이미지 변환</h1>
        </div>

        <div className="field-group">
          <span className="field-label">대상 포맷</span>
          <div className="segmented-control" role="group" aria-label="대상 포맷">
            {(Object.keys(targetFormatLabels) as ImageFormatConversionTarget[]).map(
              (format) => (
                <button
                  key={format}
                  className="segment-button"
                  type="button"
                  aria-pressed={targetFormat === format}
                  disabled={isProcessing}
                  onClick={() => handleTargetFormatChange(format)}
                >
                  {targetFormatLabels[format]}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="image-format-actions">
          <button
            className="secondary-action"
            type="button"
            disabled={isProcessing}
            onClick={() => void handleSelectImages()}
          >
            이미지 선택
          </button>
          <button
            className="primary-action"
            type="button"
            disabled={!canConvert}
            onClick={() => void handleConvertImages()}
          >
            변환
          </button>
        </div>

        <label className="checkbox-option">
          <input
            type="checkbox"
            checked={hasConfirmedReplacement}
            disabled={selectedPaths.length === 0 || isProcessing}
            onChange={(event) =>
              setHasConfirmedReplacement(event.target.checked)
            }
          />
          <span>원본 파일 교체 확인</span>
        </label>

        {status !== null ? (
          <p
            className={`qr-action-status qr-action-status-${status.phase}`}
            role={statusRole}
          >
            {status.message}
          </p>
        ) : null}
      </section>

      <section
        className="image-format-panel"
        aria-labelledby="image-format-selection-title"
      >
        <div className="preview-header">
          <h2 id="image-format-selection-title">선택 파일</h2>
          <span className="preview-state">{selectedPaths.length}개</span>
        </div>

        {selectedPaths.length > 0 ? (
          <ul className="selected-file-list">
            {selectedPaths.map((path) => (
              <li key={path} title={path}>
                {getImageFileName(path)}
              </li>
            ))}
          </ul>
        ) : (
          <div className="selected-file-empty">선택된 이미지 없음</div>
        )}
      </section>
    </div>
  );
}

function getConversionErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "이미지 변환 실패. 파일과 대상 형식을 확인하세요.";
}
