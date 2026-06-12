import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

export type SaveQrCodePngResult =
  | {
      status: "saved";
    }
  | {
      status: "cancelled";
    };

export type SaveQrCodePngDeps = {
  openSaveDialog: (defaultPath: string) => Promise<string | null>;
  renderPngBytes: (svgElement: SVGSVGElement) => Promise<number[]>;
  writePngFile: (path: string, pngBytes: number[]) => Promise<void>;
};

export function createQrCodePngFileName(urlValue: string): string {
  const parsedUrl = new URL(urlValue);
  const hostSlug = parsedUrl.hostname
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `qr-${hostSlug || "url"}.png`;
}

export async function saveQrCodePng(
  urlValue: string,
  svgElement: SVGSVGElement,
  deps: SaveQrCodePngDeps = defaultSaveQrCodePngDeps,
): Promise<SaveQrCodePngResult> {
  const selectedPath = await deps.openSaveDialog(createQrCodePngFileName(urlValue));

  if (selectedPath === null) {
    return { status: "cancelled" };
  }

  const pngBytes = await deps.renderPngBytes(svgElement);
  await deps.writePngFile(selectedPath, pngBytes);

  return { status: "saved" };
}

export async function renderQrSvgToPngBytes(
  svgElement: SVGSVGElement,
): Promise<number[]> {
  const serializedSvg = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([serializedSvg], {
    type: "image/svg+xml;charset=utf-8",
  });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    const size = 512;
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");

    if (context === null) {
      throw new Error("PNG 변환을 시작할 수 없습니다.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);

    const pngBlob = await canvasToPngBlob(canvas);
    return Array.from(new Uint8Array(await pngBlob.arrayBuffer()));
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();

  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("QR코드 이미지를 읽을 수 없습니다."));
    image.src = src;
  });
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error("PNG 파일을 만들 수 없습니다."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
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
