import { describe, expect, it, vi } from "vitest";
import { createQrCodePngFileName, saveQrCodePng } from "./qrCodePng";

describe("createQrCodePngFileName", () => {
  it("uses URL host for the default PNG file name", () => {
    expect(createQrCodePngFileName("https://Example.com/path")).toBe(
      "qr-example.com.png",
    );
  });

  it("sanitizes host characters for the default PNG file name", () => {
    expect(createQrCodePngFileName("https://한글.example.com/path")).toBe(
      "qr-xn--bj0bj06e.example.com.png",
    );
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
      openSaveDialog: vi.fn().mockResolvedValue("/tmp/qr-example.com.png"),
      renderPngBytes: vi.fn().mockResolvedValue(pngBytes),
      writePngFile: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      saveQrCodePng("https://example.com", svgElement, "white", deps),
    ).resolves.toEqual({
      status: "saved",
    });

    expect(deps.openSaveDialog).toHaveBeenCalledWith("qr-example.com.png");
    expect(deps.renderPngBytes).toHaveBeenCalledWith(svgElement, "white");
    expect(deps.writePngFile).toHaveBeenCalledWith(
      "/tmp/qr-example.com.png",
      pngBytes,
    );
  });

  it("passes the selected background to the PNG renderer", async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71]);
    const deps = {
      openSaveDialog: vi.fn().mockResolvedValue("/tmp/qr-example.com.png"),
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
