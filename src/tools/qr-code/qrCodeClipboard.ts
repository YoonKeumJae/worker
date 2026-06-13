import { invoke } from "@tauri-apps/api/core";
import { renderQrSvgToPngBytes } from "./qrCodeImage";

export type CopyQrCodeImageResult =
  | {
      status: "copied";
    }
  | {
      status: "unsupported";
    };

export type CopyQrCodeImageDeps = {
  renderPngBytes: (svgElement: SVGSVGElement) => Promise<Uint8Array>;
  copyPngImageToClipboard: (
    pngBytes: Uint8Array,
  ) => Promise<CopyQrCodeImageResult>;
};

export async function copyQrCodeImage(
  svgElement: SVGSVGElement,
  deps: CopyQrCodeImageDeps = defaultCopyQrCodeImageDeps,
): Promise<CopyQrCodeImageResult> {
  const pngBytes = await deps.renderPngBytes(svgElement);
  return deps.copyPngImageToClipboard(pngBytes);
}

const defaultCopyQrCodeImageDeps: CopyQrCodeImageDeps = {
  renderPngBytes: renderQrSvgToPngBytes,
  copyPngImageToClipboard: (pngBytes) =>
    invoke("copy_qr_code_image", {
      pngBytes,
    }),
};
