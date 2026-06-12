import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

export type SaveQrCodeSvgResult =
  | {
      status: "saved";
    }
  | {
      status: "cancelled";
    };

export type SaveQrCodeSvgDeps = {
  openSaveDialog: (defaultPath: string) => Promise<string | null>;
  serializeSvg: (svgElement: SVGSVGElement) => string;
  writeSvgFile: (path: string, svgText: string) => Promise<void>;
};

export function createQrCodeSvgFileName(urlValue: string): string {
  const parsedUrl = new URL(urlValue);
  const hostSlug = parsedUrl.hostname
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `qr-${hostSlug || "url"}.svg`;
}

export function serializeQrCodeSvg(svgElement: SVGSVGElement): string {
  return new XMLSerializer().serializeToString(svgElement);
}

export async function saveQrCodeSvg(
  urlValue: string,
  svgElement: SVGSVGElement,
  deps: SaveQrCodeSvgDeps = defaultSaveQrCodeSvgDeps,
): Promise<SaveQrCodeSvgResult> {
  const selectedPath = await deps.openSaveDialog(createQrCodeSvgFileName(urlValue));

  if (selectedPath === null) {
    return { status: "cancelled" };
  }

  const svgText = deps.serializeSvg(svgElement);
  await deps.writeSvgFile(selectedPath, svgText);

  return { status: "saved" };
}

const defaultSaveQrCodeSvgDeps: SaveQrCodeSvgDeps = {
  openSaveDialog: (defaultPath) =>
    save({
      title: "QR코드 SVG 저장",
      defaultPath,
      filters: [
        {
          name: "SVG 이미지",
          extensions: ["svg"],
        },
      ],
    }),
  serializeSvg: serializeQrCodeSvg,
  writeSvgFile: (path, svgText) =>
    invoke("save_qr_code_svg", {
      path,
      svgText,
    }),
};
