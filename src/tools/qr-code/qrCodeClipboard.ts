import { invoke } from "@tauri-apps/api/core";
import type { QrCodeBackground } from "./qrCodeBackground";
import { defaultQrCodeBackground } from "./qrCodeBackground";
import { renderQrSvgToPngBytes } from "./qrCodeImage";

export type CopyQrCodeImageResult =
  | {
      status: "copied";
    }
  | {
      status: "unsupported";
    };

export type CopyQrCodeImageDeps = {
  renderPngBytes: (
    svgElement: SVGSVGElement,
    background: QrCodeBackground,
  ) => Promise<Uint8Array>;
  copyPngImageToClipboard: (
    pngBytes: Uint8Array,
  ) => Promise<CopyQrCodeImageResult>;
};

export async function copyQrCodeImage(
  svgElement: SVGSVGElement,
  background: QrCodeBackground = defaultQrCodeBackground,
  deps: CopyQrCodeImageDeps = defaultCopyQrCodeImageDeps,
): Promise<CopyQrCodeImageResult> {
  const pngBytes = await deps.renderPngBytes(svgElement, background);
  return deps.copyPngImageToClipboard(pngBytes);
}

export function copyPngImageToClipboard(
  pngBytes: Uint8Array,
): Promise<CopyQrCodeImageResult> {
  return invoke("copy_qr_code_image", {
    pngBytes: Array.from(pngBytes),
  });
}

const defaultCopyQrCodeImageDeps: CopyQrCodeImageDeps = {
  renderPngBytes: renderQrSvgToPngBytes,
  copyPngImageToClipboard: copyPngImageToClipboard,
};
