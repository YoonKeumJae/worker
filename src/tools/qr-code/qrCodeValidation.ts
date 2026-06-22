export type QrCodeUrlValidationResult =
  | {
      isValid: true;
      value: string;
      errorMessage: null;
    }
  | {
      isValid: false;
      value: null;
      errorMessage: string;
    };

export const maxQrCodeUrlByteLength = 2_000;

function hasExplicitUrlScheme(urlValue: string): boolean {
  const colonIndex = urlValue.indexOf(":");

  if (colonIndex < 0) {
    return false;
  }

  const firstPathMarkerIndex = urlValue.search(/[/?#]/);

  if (firstPathMarkerIndex >= 0 && firstPathMarkerIndex < colonIndex) {
    return false;
  }

  const scheme = urlValue.slice(0, colonIndex);

  return /^[a-z][a-z0-9+.-]*$/i.test(scheme) && !scheme.includes(".");
}

function isSupportedHttpHost(hostname: string): boolean {
  return (
    hostname.includes(".") ||
    hostname === "localhost" ||
    (hostname.startsWith("[") && hostname.endsWith("]"))
  );
}

export function normalizeQrCodeUrl(rawUrl: string): string {
  const trimmedUrl = rawUrl.trim();
  const hasScheme = hasExplicitUrlScheme(trimmedUrl);
  const urlWithScheme = hasScheme ? trimmedUrl : `https://${trimmedUrl}`;
  const parsedUrl = new URL(urlWithScheme);

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Unsupported URL scheme");
  }

  if (!hasScheme && (parsedUrl.username.length > 0 || parsedUrl.password.length > 0)) {
    throw new Error("Invalid URL userinfo");
  }

  if (!isSupportedHttpHost(parsedUrl.hostname)) {
    throw new Error("Invalid URL host");
  }

  return parsedUrl.href;
}

export function validateQrCodeUrl(rawUrl: string): QrCodeUrlValidationResult {
  const trimmedUrl = rawUrl.trim();

  // 빈 값은 QR payload로 의미가 없고 사용자가 다음 행동을 결정하기 어렵다.
  // 입력 직후 명확한 메시지를 보여주기 위해 URL parser를 호출하기 전에 먼저 분기한다.
  if (trimmedUrl.length === 0) {
    return {
      isValid: false,
      value: null,
      errorMessage: "URL을 입력하세요.",
    };
  }

  try {
    const normalizedUrl = normalizeQrCodeUrl(trimmedUrl);
    const normalizedUrlByteLength = new TextEncoder().encode(normalizedUrl).length;

    // qrcode.react는 QR 최대 용량을 넘는 payload를 렌더링할 때 예외를 던질 수 있다.
    // error correction M 기준 QR version 40 byte mode 최대치보다 낮은 앱 제한을 둬 렌더 실패를 validation에서 막는다.
    if (normalizedUrlByteLength > maxQrCodeUrlByteLength) {
      return {
        isValid: false,
        value: null,
        errorMessage: "QR코드로 만들 URL이 너무 깁니다.",
      };
    }

    return {
      isValid: true,
      value: normalizedUrl,
      errorMessage: null,
    };
  } catch {
    // URL 생성자가 거부한 입력은 세부 parser 오류를 노출하지 않는다.
    // 사용자가 필요한 행동은 URL 형식 수정 하나뿐이라 짧은 고정 문구를 유지한다.
    return {
      isValid: false,
      value: null,
      errorMessage: "유효한 URL을 입력하세요.",
    };
  }
}
