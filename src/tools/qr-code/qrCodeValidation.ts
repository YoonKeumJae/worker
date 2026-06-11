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
    const parsedUrl = new URL(trimmedUrl);

    // 첫 QR 기능 PR은 일반 웹 URL만 지원한다.
    // file:, mailto:, javascript: 같은 scheme은 QR로 만들 수 있어도 사용 범위와 보안 기대가 다르다.
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return {
        isValid: false,
        value: null,
        errorMessage: "유효한 URL을 입력하세요.",
      };
    }

    return {
      isValid: true,
      value: parsedUrl.href,
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
