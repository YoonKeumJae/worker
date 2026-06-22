import { describe, expect, it } from "vitest";
import {
  maxQrCodeUrlByteLength,
  normalizeQrCodeUrl,
  validateQrCodeUrl,
} from "./qrCodeValidation";

describe("normalizeQrCodeUrl", () => {
  it("adds https scheme to domain input without scheme", () => {
    expect(normalizeQrCodeUrl(" example.com/path ")).toBe(
      "https://example.com/path",
    );
  });

  it("keeps explicit http scheme", () => {
    expect(normalizeQrCodeUrl("http://example.com")).toBe(
      "http://example.com/",
    );
  });

  it("keeps explicit localhost and IPv6 loopback URLs", () => {
    expect(normalizeQrCodeUrl("http://localhost:3000")).toBe(
      "http://localhost:3000/",
    );
    expect(normalizeQrCodeUrl("http://[::1]:5173")).toBe(
      "http://[::1]:5173/",
    );
  });

  it("rejects scheme-free inputs that become URL userinfo", () => {
    expect(() => normalizeQrCodeUrl("example.com@evil.com")).toThrow();
  });
});

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
    expect(validateQrCodeUrl("not a url")).toEqual({
      isValid: false,
      value: null,
      errorMessage: "유효한 URL을 입력하세요.",
    });
  });

  it("accepts http, https, and scheme-free domain URLs", () => {
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
    expect(validateQrCodeUrl("example.com")).toEqual({
      isValid: true,
      value: "https://example.com/",
      errorMessage: null,
    });
  });

  it("accepts local development server URLs", () => {
    expect(validateQrCodeUrl("http://localhost:3000")).toEqual({
      isValid: true,
      value: "http://localhost:3000/",
      errorMessage: null,
    });
    expect(validateQrCodeUrl("http://[::1]:5173")).toEqual({
      isValid: true,
      value: "http://[::1]:5173/",
      errorMessage: null,
    });
  });

  it("rejects scheme-free URL input with userinfo", () => {
    expect(validateQrCodeUrl("example.com@evil.com")).toEqual({
      isValid: false,
      value: null,
      errorMessage: "유효한 URL을 입력하세요.",
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
