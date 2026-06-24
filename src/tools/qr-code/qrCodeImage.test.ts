import { afterEach, describe, expect, it, vi } from "vitest";
import { renderQrSvgToPngBytes } from "./qrCodeImage";

describe("renderQrSvgToPngBytes", () => {
  const originalImage = globalThis.Image;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;

  afterEach(() => {
    globalThis.Image = originalImage;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
    vi.restoreAllMocks();
  });

  it("fills the canvas with white before drawing a white-background PNG", async () => {
    const { context } = mockCanvasConversion();
    const svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );

    await renderQrSvgToPngBytes(svgElement, "white");

    expect(context.fillStyle).toBe("#ffffff");
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 512, 512);
    expect(context.drawImage).toHaveBeenCalled();
  });

  it("draws a transparent-background PNG without filling the canvas", async () => {
    const { context } = mockCanvasConversion();
    const svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );

    await renderQrSvgToPngBytes(svgElement, "transparent");

    expect(context.fillRect).not.toHaveBeenCalled();
    expect(context.drawImage).toHaveBeenCalled();
  });
});

function mockCanvasConversion() {
  URL.createObjectURL = vi.fn().mockReturnValue("blob:qr-code");
  URL.revokeObjectURL = vi.fn();

  class LoadedImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      this.onload?.();
    }
  }

  globalThis.Image = LoadedImage as unknown as typeof Image;

  const context = {
    fillStyle: "",
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  };

  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(context);
  HTMLCanvasElement.prototype.toBlob = vi.fn((callback: BlobCallback) => {
    callback({
      arrayBuffer: () =>
        Promise.resolve(new Uint8Array([137, 80, 78, 71]).buffer),
    } as Blob);
  });

  return { context };
}
