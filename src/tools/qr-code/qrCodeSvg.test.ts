import { describe, expect, it, vi } from "vitest";
import {
  createQrCodeSvgFileName,
  saveQrCodeSvg,
  serializeQrCodeSvg,
} from "./qrCodeSvg";

describe("createQrCodeSvgFileName", () => {
  it("uses URL host for the default SVG file name", () => {
    expect(createQrCodeSvgFileName("https://Example.com/path")).toBe(
      "qr-example.com.svg",
    );
  });

  it("sanitizes host characters for the default SVG file name", () => {
    expect(createQrCodeSvgFileName("https://한글.example.com/path")).toBe(
      "qr-xn--bj0bj06e.example.com.svg",
    );
  });
});

describe("serializeQrCodeSvg", () => {
  it("serializes the selected SVG element as SVG text", () => {
    const svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    svgElement.setAttribute("role", "img");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M0 0h1v1H0z");
    svgElement.append(path);

    const svgText = serializeQrCodeSvg(svgElement);

    expect(svgText).toContain("<svg");
    expect(svgText).toContain('role="img"');
    expect(svgText).toContain("<path");
  });

  it("keeps the white background rect for a white-background SVG", () => {
    const svgElement = createSvgWithWhiteBackground();

    const svgText = serializeQrCodeSvg(svgElement, "white");

    expect(svgText).toContain('fill="#ffffff"');
    expect(svgText).toContain("<rect");
  });

  it("removes the white background rect for a transparent-background SVG", () => {
    const svgElement = createSvgWithWhiteBackground();

    const svgText = serializeQrCodeSvg(svgElement, "transparent");

    expect(svgText).not.toContain('fill="#ffffff"');
    expect(svgText).not.toContain("<rect");
    expect(svgText).toContain("<path");
  });
});

describe("saveQrCodeSvg", () => {
  const svgElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  );

  it("writes serialized SVG text when a save path is selected", async () => {
    const deps = {
      openSaveDialog: vi.fn().mockResolvedValue("/tmp/qr-example.com.svg"),
      serializeSvg: vi.fn().mockReturnValue("<svg></svg>"),
      writeSvgFile: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      saveQrCodeSvg("https://example.com", svgElement, "white", deps),
    ).resolves.toEqual({
      status: "saved",
    });

    expect(deps.openSaveDialog).toHaveBeenCalledWith("qr-example.com.svg");
    expect(deps.serializeSvg).toHaveBeenCalledWith(svgElement, "white");
    expect(deps.writeSvgFile).toHaveBeenCalledWith(
      "/tmp/qr-example.com.svg",
      "<svg></svg>",
    );
  });

  it("passes the selected background to the SVG serializer", async () => {
    const deps = {
      openSaveDialog: vi.fn().mockResolvedValue("/tmp/qr-example.com.svg"),
      serializeSvg: vi.fn().mockReturnValue("<svg></svg>"),
      writeSvgFile: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      saveQrCodeSvg("https://example.com", svgElement, "transparent", deps),
    ).resolves.toEqual({
      status: "saved",
    });

    expect(deps.serializeSvg).toHaveBeenCalledWith(svgElement, "transparent");
  });

  it("returns cancelled without serializing or writing when dialog is cancelled", async () => {
    const deps = {
      openSaveDialog: vi.fn().mockResolvedValue(null),
      serializeSvg: vi.fn().mockReturnValue("<svg></svg>"),
      writeSvgFile: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      saveQrCodeSvg("https://example.com", svgElement, "white", deps),
    ).resolves.toEqual({
      status: "cancelled",
    });

    expect(deps.serializeSvg).not.toHaveBeenCalled();
    expect(deps.writeSvgFile).not.toHaveBeenCalled();
  });
});

function createSvgWithWhiteBackground() {
  const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const background = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  background.setAttribute("width", "100%");
  background.setAttribute("height", "100%");
  background.setAttribute("fill", "#ffffff");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "#000000");
  path.setAttribute("d", "M0 0h1v1H0z");

  svgElement.append(background, path);

  return svgElement;
}
