import { describe, expect, it } from "vitest";
import { validateQrCodeUrl } from "./qrCodeValidation";

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
});
