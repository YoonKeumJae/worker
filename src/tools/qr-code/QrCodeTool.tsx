import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { saveQrCodePng } from "./qrCodePng";
import { saveQrCodeSvg } from "./qrCodeSvg";
import { validateQrCodeUrl } from "./qrCodeValidation";

const qrPreviewSize = 232;
type SaveFormat = "PNG" | "SVG";
type SaveStatusPhase = "saving" | "saved" | "cancelled" | "failed";
type SaveStatus = {
  format: SaveFormat;
  phase: SaveStatusPhase;
} | null;

const saveStatusMessage: Record<SaveStatusPhase, (format: SaveFormat) => string> = {
  saving: (format) => `${format} 저장 중...`,
  saved: (format) => `${format} 저장 완료.`,
  cancelled: (format) => `${format} 저장 취소.`,
  failed: (format) => `${format} 저장 실패. 다시 시도하세요.`,
};

export function QrCodeTool() {
  const [urlInput, setUrlInput] = useState("");
  const [hasVisitedUrlInput, setHasVisitedUrlInput] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const qrPreviewSurfaceRef = useRef<HTMLDivElement>(null);

  // validation은 순수 함수로 분리해 UI와 도메인 규칙을 분리한다.
  // useMemo는 입력이 바뀔 때만 검증하게 해 렌더링 흐름을 명확히 유지한다.
  const validationResult = useMemo(
    () => validateQrCodeUrl(urlInput),
    [urlInput],
  );

  // 초기 빈 화면에서 오류를 바로 띄우면 사용자가 아직 아무 행동도 하기 전에 실패 상태가 된다.
  // 대신 한 번 입력하거나 focus를 떠난 뒤부터 빈 값과 형식 오류를 모두 표시한다.
  const shouldShowError =
    (urlInput.length > 0 || hasVisitedUrlInput) && !validationResult.isValid;
  const inputDescriptionId = shouldShowError
    ? "qr-code-url-error"
    : "qr-code-url-hint";
  const isSaving = saveStatus?.phase === "saving";
  const canSave = validationResult.isValid && !isSaving;
  const currentSaveMessage =
    saveStatus === null
      ? null
      : saveStatusMessage[saveStatus.phase](saveStatus.format);

  async function handleSave(format: SaveFormat) {
    if (!validationResult.isValid || isSaving) {
      return;
    }

    const svgElement = qrPreviewSurfaceRef.current?.querySelector("svg");

    if (!(svgElement instanceof SVGSVGElement)) {
      setSaveStatus({ format, phase: "failed" });
      return;
    }

    setSaveStatus({ format, phase: "saving" });

    try {
      const result =
        format === "PNG"
          ? await saveQrCodePng(validationResult.value, svgElement)
          : await saveQrCodeSvg(validationResult.value, svgElement);
      setSaveStatus({
        format,
        phase: result.status === "saved" ? "saved" : "cancelled",
      });
    } catch {
      setSaveStatus({ format, phase: "failed" });
    }
  }

  function handleUrlInputChange(nextUrlInput: string) {
    setUrlInput(nextUrlInput);
    setSaveStatus(null);
  }

  return (
    <div className="qr-tool">
      <section className="qr-input-panel" aria-labelledby="current-tool-title">
        <div className="qr-heading">
          <p className="tool-kicker">QR코드 생성</p>
          <h1 id="current-tool-title">QR코드</h1>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="qr-code-url">
            URL
          </label>
          <input
            id="qr-code-url"
            className="url-input"
            type="url"
            inputMode="url"
            placeholder="https://example.com"
            value={urlInput}
            aria-invalid={shouldShowError}
            aria-describedby={inputDescriptionId}
            onChange={(event) => handleUrlInputChange(event.target.value)}
            onBlur={() => setHasVisitedUrlInput(true)}
          />
          {shouldShowError ? (
            <p className="field-error" id="qr-code-url-error" role="alert">
              {validationResult.errorMessage}
            </p>
          ) : (
            <p className="field-hint" id="qr-code-url-hint">
              http:// 또는 https:// 주소를 입력하세요.
            </p>
          )}
        </div>
      </section>

      <section className="qr-preview-panel" aria-labelledby="qr-preview-title">
        <div className="preview-header">
          <h2 id="qr-preview-title">미리보기</h2>
          <span className="preview-state">
            {validationResult.isValid ? "생성됨" : "대기 중"}
          </span>
        </div>

        <div
          className="qr-preview-surface"
          aria-live="polite"
          ref={qrPreviewSurfaceRef}
        >
          {validationResult.isValid ? (
            <QRCodeSVG
              value={validationResult.value}
              size={qrPreviewSize}
              level="M"
              marginSize={2}
              bgColor="#ffffff"
              fgColor="#000000"
              role="img"
              aria-label="입력한 URL의 QR코드 미리보기"
            />
          ) : (
            <div className="qr-preview-empty">
              URL 입력 후 QR코드 표시
            </div>
          )}
        </div>

        <div className="qr-action-group">
          <button
            className="primary-action"
            type="button"
            disabled={!canSave}
            onClick={() => void handleSave("PNG")}
          >
            PNG 저장
          </button>
          <button
            className="secondary-action"
            type="button"
            disabled={!canSave}
            onClick={() => void handleSave("SVG")}
          >
            SVG 저장
          </button>
        </div>

        {currentSaveMessage !== null && saveStatus !== null ? (
          <p
            className={`qr-save-status qr-save-status-${saveStatus.phase}`}
            role={saveStatus.phase === "failed" ? "alert" : "status"}
          >
            {currentSaveMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
}
