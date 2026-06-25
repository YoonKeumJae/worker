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

    expect(fileName).toBe(
      "https-example.com-a-b-q=1-2#bad%22name%3c%3e-qr.png",
    );
    expect(fileName).not.toMatch(/[\\/:*?"<>|]/);
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
