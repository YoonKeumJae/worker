import { describe, expect, it, vi } from "vitest";
import { copyQrCodeImage } from "./qrCodeClipboard";

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

    await expect(copyQrCodeImage(svgElement, deps)).resolves.toEqual({
      status: "copied",
    });

    expect(deps.renderPngBytes).toHaveBeenCalledWith(svgElement);
    expect(deps.copyPngImageToClipboard).toHaveBeenCalledWith(pngBytes);
  });

  it("returns unsupported when the clipboard backend is unavailable", async () => {
    const deps = {
      renderPngBytes: vi.fn().mockResolvedValue(new Uint8Array([137])),
      copyPngImageToClipboard: vi
        .fn()
        .mockResolvedValue({ status: "unsupported" }),
    };

    await expect(copyQrCodeImage(svgElement, deps)).resolves.toEqual({
      status: "unsupported",
    });
  });
});
