import { describe, expect, it } from "vitest";
import {
  maxQrCodeUrlByteLength,
  validateQrCodeUrl,
} from "./qrCodeValidation";

describe("validateQrCodeUrl", () => {
  it("rejects empty URL input", () => {
    expect(validateQrCodeUrl("   ")).toEqual({
      isValid: false,
      value: null,
      errorMessage: "URL을 입력하세요.",
    });
  });

  it("rejects unsupported or malformed URL input", () => {
    expect(validateQrCodeUrl("mailto:test@example.com")).toEqual({
      isValid: false,
      value: null,
      errorMessage: "유효한 URL을 입력하세요.",
    });
    expect(validateQrCodeUrl("example.com")).toEqual({
      isValid: false,
      value: null,
      errorMessage: "유효한 URL을 입력하세요.",
    });
  });

  it("accepts http and https URLs", () => {
    expect(validateQrCodeUrl(" https://example.com/path ")).toEqual({
      isValid: true,
      value: "https://example.com/path",
      errorMessage: null,
    });
    expect(validateQrCodeUrl("http://example.com")).toEqual({
      isValid: true,
      value: "http://example.com/",
      errorMessage: null,
    });
  });

  it("rejects URLs that are too long for QR preview rendering", () => {
    const longUrl = `https://example.com/${"a".repeat(maxQrCodeUrlByteLength)}`;

    expect(validateQrCodeUrl(longUrl)).toEqual({
      isValid: false,
      value: null,
      errorMessage: "QR코드로 만들 URL이 너무 깁니다.",
    });
  });
});
