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

  it("keeps explicit http and https URLs with single-label hosts", () => {
    expect(normalizeQrCodeUrl("http://intranet")).toBe("http://intranet/");
    expect(normalizeQrCodeUrl("https://nas")).toBe("https://nas/");
  });

  it("adds https scheme to localhost input with a port", () => {
    expect(normalizeQrCodeUrl("localhost:3000")).toBe(
      "https://localhost:3000/",
    );
  });

  it("rejects scheme-free inputs that become URL userinfo", () => {
    expect(() => normalizeQrCodeUrl("example.com@evil.com")).toThrow();
  });

  it("rejects scheme-free inputs with invalid host labels", () => {
    expect(() => normalizeQrCodeUrl(".")).toThrow();
    expect(() => normalizeQrCodeUrl(".com")).toThrow();
    expect(() => normalizeQrCodeUrl("example..com")).toThrow();
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
    expect(validateQrCodeUrl("localhost:3000")).toEqual({
      isValid: true,
      value: "https://localhost:3000/",
      errorMessage: null,
    });
  });

  it("accepts explicit http and https URLs with single-label hosts", () => {
    expect(validateQrCodeUrl("http://intranet")).toEqual({
      isValid: true,
      value: "http://intranet/",
      errorMessage: null,
    });
    expect(validateQrCodeUrl("https://nas")).toEqual({
      isValid: true,
      value: "https://nas/",
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

  it("rejects scheme-free URL input with invalid host labels", () => {
    expect(validateQrCodeUrl(".")).toEqual({
      isValid: false,
      value: null,
      errorMessage: "유효한 URL을 입력하세요.",
    });
    expect(validateQrCodeUrl(".com")).toEqual({
      isValid: false,
      value: null,
      errorMessage: "유효한 URL을 입력하세요.",
    });
    expect(validateQrCodeUrl("example..com")).toEqual({
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
