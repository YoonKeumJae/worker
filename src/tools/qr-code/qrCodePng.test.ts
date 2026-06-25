import { describe, expect, it, vi } from "vitest";
import { createQrCodePngFileName, saveQrCodePng } from "./qrCodePng";

describe("createQrCodePngFileName", () => {
  it("uses normalized URL slug for the default PNG file name", () => {
    expect(createQrCodePngFileName("https://Example.com/path")).toBe(
      "https-example.com-path-qr.png",
    );
  });

  it("uses normalized URL for scheme-free input in the default PNG file name", () => {
    expect(createQrCodePngFileName("https://example.com/")).toBe(
      "https-example.com-qr.png",
    );
  });

  it("sanitizes path, query, hash, and Windows forbidden characters for the default PNG file name", () => {
    const fileName =
      createQrCodePngFileName('https://example.com/a/b?q=1*2#bad"name<>|');

    expect(fileName).toMatch(
      /^https-example\.com-a-b-query#fragment-[a-z0-9]{8}-qr\.png$/,
    );
    expect(fileName).not.toMatch(/[\\/:*?"<>|]/);
    expect(fileName).not.toContain("q=1");
    expect(fileName).not.toContain("bad");
  });

  it("does not expose URL credentials in the default PNG file name", () => {
    const fileName = createQrCodePngFileName(
      "https://user:password@example.com/path?token=secret#secret",
    );

    expect(fileName).toMatch(
      /^https-example\.com-path-query#fragment-[a-z0-9]{8}-qr\.png$/,
    );
    expect(fileName).not.toContain("user");
    expect(fileName).not.toContain("password");
    expect(fileName).not.toContain("token");
    expect(fileName).not.toContain("secret");
  });

  it("limits long PNG file names to a safe file-name component length", () => {
    const fileName = createQrCodePngFileName(
      `https://example.com/${"a".repeat(500)}`,
    );

    expect(fileName).toHaveLength(240);
    expect(fileName).toMatch(/[a-z0-9]{8}-qr\.png$/);
  });

  it("falls back to URL slug when the PNG file name slug is empty", () => {
    expect(createQrCodePngFileName("\u0000")).toBe("url-qr.png");
  });
});

describe("saveQrCodePng", () => {
  const svgElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  );

  it("writes rendered PNG bytes when a save path is selected", async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71]);
    const deps = {
      openSaveDialog: vi.fn().mockResolvedValue("/tmp/https-example.com-qr.png"),
      renderPngBytes: vi.fn().mockResolvedValue(pngBytes),
      writePngFile: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      saveQrCodePng("https://example.com", svgElement, "white", deps),
    ).resolves.toEqual({
      status: "saved",
    });

    expect(deps.openSaveDialog).toHaveBeenCalledWith("https-example.com-qr.png");
    expect(deps.renderPngBytes).toHaveBeenCalledWith(svgElement, "white");
    expect(deps.writePngFile).toHaveBeenCalledWith(
      "/tmp/https-example.com-qr.png",
      pngBytes,
    );
  });

  it("passes the selected background to the PNG renderer", async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71]);
    const deps = {
      openSaveDialog: vi.fn().mockResolvedValue("/tmp/https-example.com-qr.png"),
      renderPngBytes: vi.fn().mockResolvedValue(pngBytes),
      writePngFile: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      saveQrCodePng("https://example.com", svgElement, "transparent", deps),
    ).resolves.toEqual({
      status: "saved",
    });

    expect(deps.renderPngBytes).toHaveBeenCalledWith(svgElement, "transparent");
  });

  it("returns cancelled without rendering or writing when dialog is cancelled", async () => {
    const deps = {
      openSaveDialog: vi.fn().mockResolvedValue(null),
      renderPngBytes: vi.fn().mockResolvedValue(new Uint8Array([137, 80, 78, 71])),
      writePngFile: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      saveQrCodePng("https://example.com", svgElement, "white", deps),
    ).resolves.toEqual({
      status: "cancelled",
    });

    expect(deps.renderPngBytes).not.toHaveBeenCalled();
    expect(deps.writePngFile).not.toHaveBeenCalled();
  });
});
