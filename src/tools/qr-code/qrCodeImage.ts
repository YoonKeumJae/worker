import type { QrCodeBackground } from "./qrCodeBackground";
import { defaultQrCodeBackground } from "./qrCodeBackground";
import { serializeQrCodeSvg } from "./qrCodeSvg";

export async function renderQrSvgToPngBytes(
  svgElement: SVGSVGElement,
  background: QrCodeBackground = defaultQrCodeBackground,
): Promise<Uint8Array> {
  const serializedSvg = serializeQrCodeSvg(svgElement, background);
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

    if (background === "white") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size, size);
    }

    context.drawImage(image, 0, 0, size, size);

    const pngBlob = await canvasToPngBlob(canvas);
    return new Uint8Array(await pngBlob.arrayBuffer());
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
