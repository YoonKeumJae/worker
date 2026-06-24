import { describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { copyPngImageToClipboard, copyQrCodeImage } from "./qrCodeClipboard";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue({ status: "copied" }),
}));

describe("copyQrCodeImage", () => {
  const svgElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  );

  it("copies rendered PNG bytes to the clipboard", async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const deps = {
      renderPngBytes: vi.fn().mockResolvedValue(pngBytes),
      copyPngImageToClipboard: vi.fn().mockResolvedValue({ status: "copied" }),
    };

    await expect(copyQrCodeImage(svgElement, "white", deps)).resolves.toEqual({
      status: "copied",
    });

    expect(deps.renderPngBytes).toHaveBeenCalledWith(svgElement, "white");
    expect(deps.copyPngImageToClipboard).toHaveBeenCalledWith(pngBytes);
  });

  it("passes the selected background to the PNG renderer", async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const deps = {
      renderPngBytes: vi.fn().mockResolvedValue(pngBytes),
      copyPngImageToClipboard: vi.fn().mockResolvedValue({ status: "copied" }),
    };

    await expect(copyQrCodeImage(svgElement, "transparent", deps)).resolves.toEqual({
      status: "copied",
    });

    expect(deps.renderPngBytes).toHaveBeenCalledWith(svgElement, "transparent");
  });

  it("returns unsupported when the clipboard backend is unavailable", async () => {
    const deps = {
      renderPngBytes: vi.fn().mockResolvedValue(new Uint8Array([137])),
      copyPngImageToClipboard: vi
        .fn()
        .mockResolvedValue({ status: "unsupported" }),
    };

    await expect(copyQrCodeImage(svgElement, "white", deps)).resolves.toEqual({
      status: "unsupported",
    });
  });
});

describe("copyPngImageToClipboard", () => {
  it("serializes PNG bytes as a plain array for Tauri command arguments", async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71]);

    await expect(copyPngImageToClipboard(pngBytes)).resolves.toEqual({
      status: "copied",
    });

    expect(invoke).toHaveBeenCalledWith("copy_qr_code_image", {
      pngBytes: [137, 80, 78, 71],
    });
  });
});
