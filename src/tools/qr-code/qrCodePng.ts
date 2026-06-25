import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import type { QrCodeBackground } from "./qrCodeBackground";
import { defaultQrCodeBackground } from "./qrCodeBackground";
import { createQrCodeFileName } from "./qrCodeFileName";
import { renderQrSvgToPngBytes } from "./qrCodeImage";

export type SaveQrCodePngResult =
  | {
      status: "saved";
    }
  | {
      status: "cancelled";
    };

export type SaveQrCodePngDeps = {
  openSaveDialog: (defaultPath: string) => Promise<string | null>;
  renderPngBytes: (
    svgElement: SVGSVGElement,
    background: QrCodeBackground,
  ) => Promise<Uint8Array>;
  writePngFile: (path: string, pngBytes: Uint8Array) => Promise<void>;
};

export function createQrCodePngFileName(urlValue: string): string {
  return createQrCodeFileName(urlValue, "png");
}

export async function saveQrCodePng(
  urlValue: string,
  svgElement: SVGSVGElement,
  background: QrCodeBackground = defaultQrCodeBackground,
  deps: SaveQrCodePngDeps = defaultSaveQrCodePngDeps,
): Promise<SaveQrCodePngResult> {
  const selectedPath = await deps.openSaveDialog(createQrCodePngFileName(urlValue));

  if (selectedPath === null) {
    return { status: "cancelled" };
  }

  const pngBytes = await deps.renderPngBytes(svgElement, background);
  await deps.writePngFile(selectedPath, pngBytes);

  return { status: "saved" };
}

const defaultSaveQrCodePngDeps: SaveQrCodePngDeps = {
  openSaveDialog: (defaultPath) =>
    save({
      title: "QR코드 PNG 저장",
      defaultPath,
      filters: [
        {
          name: "PNG 이미지",
          extensions: ["png"],
        },
      ],
    }),
  renderPngBytes: renderQrSvgToPngBytes,
  writePngFile: (path, pngBytes) =>
    invoke("save_qr_code_png", {
      path,
      pngBytes,
    }),
};
