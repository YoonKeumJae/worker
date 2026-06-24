import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { QrCodeBackground } from "./qrCodeBackground";
import { defaultQrCodeBackground } from "./qrCodeBackground";
import { copyQrCodeImage } from "./qrCodeClipboard";
import { saveQrCodePng } from "./qrCodePng";
import { saveQrCodeSvg } from "./qrCodeSvg";
import { validateQrCodeUrl } from "./qrCodeValidation";

const qrPreviewSize = 232;
type SaveFormat = "PNG" | "SVG";
type SaveStatusPhase = "saving" | "saved" | "cancelled" | "failed";
type CopyStatusPhase = "copying" | "copied" | "unsupported" | "failed";
type SaveStatus = {
  format: SaveFormat;
  phase: SaveStatusPhase;
};
type CopyStatus = {
  format: "COPY";
  phase: CopyStatusPhase;
};
type ActionStatus = SaveStatus | CopyStatus | null;

const saveStatusMessage: Record<
  SaveStatusPhase,
  (format: SaveFormat) => string
> = {
  saving: (format) => `${format} 저장 중...`,
  saved: (format) => `${format} 저장 완료.`,
  cancelled: (format) => `${format} 저장 취소.`,
  failed: (format) => `${format} 저장 실패. 다시 시도하세요.`,
};

const copyStatusMessage: Record<CopyStatusPhase, string> = {
  copying: "이미지 복사 중...",
  copied: "복사 완료.",
  unsupported: "이미지 복사를 지원하지 않는 환경입니다.",
  failed: "이미지 복사 실패. 다시 시도하세요.",
};

export function QrCodeTool() {
  const [urlInput, setUrlInput] = useState("");
  const [background, setBackground] = useState<QrCodeBackground>(
    defaultQrCodeBackground,
  );
  const [hasVisitedUrlInput, setHasVisitedUrlInput] = useState(false);
  const [actionStatus, setActionStatus] = useState<ActionStatus>(null);
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
  const isProcessing =
    actionStatus?.phase === "saving" || actionStatus?.phase === "copying";
  const canRunAction = validationResult.isValid && !isProcessing;
  const currentActionMessage =
    actionStatus === null
      ? null
      : actionStatus.format === "COPY"
        ? copyStatusMessage[actionStatus.phase]
        : saveStatusMessage[actionStatus.phase](actionStatus.format);
  const currentActionRole =
    actionStatus?.phase === "failed" || actionStatus?.phase === "unsupported"
      ? "alert"
      : "status";

  async function handleSave(format: SaveFormat) {
    if (!validationResult.isValid || isProcessing) {
      return;
    }

    const svgElement = qrPreviewSurfaceRef.current?.querySelector("svg");

    if (!(svgElement instanceof SVGSVGElement)) {
      setActionStatus({ format, phase: "failed" });
      return;
    }

    setActionStatus({ format, phase: "saving" });

    try {
      const result =
        format === "PNG"
          ? await saveQrCodePng(validationResult.value, svgElement, background)
          : await saveQrCodeSvg(validationResult.value, svgElement, background);
      setActionStatus({
        format,
        phase: result.status === "saved" ? "saved" : "cancelled",
      });
    } catch {
      setActionStatus({ format, phase: "failed" });
    }
  }

  async function handleCopyImage() {
    if (!validationResult.isValid || isProcessing) {
      return;
    }

    const svgElement = qrPreviewSurfaceRef.current?.querySelector("svg");

    if (!(svgElement instanceof SVGSVGElement)) {
      setActionStatus({ format: "COPY", phase: "failed" });
      return;
    }

    setActionStatus({ format: "COPY", phase: "copying" });

    try {
      const result = await copyQrCodeImage(svgElement, background);
      setActionStatus({
        format: "COPY",
        phase: result.status === "copied" ? "copied" : "unsupported",
      });
    } catch {
      setActionStatus({ format: "COPY", phase: "failed" });
    }
  }

  function handleUrlInputChange(nextUrlInput: string) {
    setUrlInput(nextUrlInput);
    setActionStatus(null);
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
            type="text"
            inputMode="url"
            placeholder="example.com"
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
              주소를 입력하세요. https://는 생략할 수 있습니다.
            </p>
          )}
        </div>

        <fieldset className="field-group qr-background-options">
          <legend className="field-label">배경</legend>
          <label className="radio-option">
            <input
              type="radio"
              name="qr-code-background"
              value="white"
              checked={background === "white"}
              onChange={() => setBackground("white")}
            />
            <span>흰색</span>
          </label>
          <label className="radio-option">
            <input
              type="radio"
              name="qr-code-background"
              value="transparent"
              checked={background === "transparent"}
              onChange={() => setBackground("transparent")}
            />
            <span>투명</span>
          </label>
          <p className="field-hint">
            투명 배경은 어두운 문서에서 판독성이 낮을 수 있습니다.
          </p>
        </fieldset>
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
            disabled={!canRunAction}
            onClick={() => void handleSave("PNG")}
          >
            PNG 저장
          </button>
          <button
            className="secondary-action"
            type="button"
            disabled={!canRunAction}
            onClick={() => void handleSave("SVG")}
          >
            SVG 저장
          </button>
          <button
            className="secondary-action"
            type="button"
            disabled={!canRunAction}
            onClick={() => void handleCopyImage()}
          >
            이미지 복사
          </button>
        </div>

        {currentActionMessage !== null && actionStatus !== null ? (
          <p
            className={`qr-action-status qr-action-status-${actionStatus.phase}`}
            role={currentActionRole}
          >
            {currentActionMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
}
