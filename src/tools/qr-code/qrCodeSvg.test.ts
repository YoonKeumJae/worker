import { describe, expect, it, vi } from "vitest";
import {
  createQrCodeSvgFileName,
  saveQrCodeSvg,
  serializeQrCodeSvg,
} from "./qrCodeSvg";

describe("createQrCodeSvgFileName", () => {
  it("uses normalized URL slug for the default SVG file name", () => {
    expect(createQrCodeSvgFileName("https://Example.com/path")).toBe(
      "https-example.com-path-qr.svg",
    );
  });

  it("uses normalized URL for scheme-free input in the default SVG file name", () => {
    expect(createQrCodeSvgFileName("https://example.com/")).toBe(
      "https-example.com-qr.svg",
    );
  });

  it("sanitizes path, query, hash, and Windows forbidden characters for the default SVG file name", () => {
    const fileName =
      createQrCodeSvgFileName('https://example.com/a/b?q=1*2#bad"name<>|');

    expect(fileName).toBe(
      "https-example.com-a-b-q=1-2#bad%22name%3c%3e-qr.svg",
    );
    expect(fileName).not.toMatch(/[\\/:*?"<>|]/);
  });

  it("falls back to URL slug when the SVG file name slug is empty", () => {
    expect(createQrCodeSvgFileName("\u0000")).toBe("url-qr.svg");
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
      openSaveDialog: vi.fn().mockResolvedValue("/tmp/https-example.com-qr.svg"),
      serializeSvg: vi.fn().mockReturnValue("<svg></svg>"),
      writeSvgFile: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      saveQrCodeSvg("https://example.com", svgElement, "white", deps),
    ).resolves.toEqual({
      status: "saved",
    });

    expect(deps.openSaveDialog).toHaveBeenCalledWith("https-example.com-qr.svg");
    expect(deps.serializeSvg).toHaveBeenCalledWith(svgElement, "white");
    expect(deps.writeSvgFile).toHaveBeenCalledWith(
      "/tmp/https-example.com-qr.svg",
      "<svg></svg>",
    );
  });

  it("passes the selected background to the SVG serializer", async () => {
    const deps = {
      openSaveDialog: vi.fn().mockResolvedValue("/tmp/https-example.com-qr.svg"),
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
