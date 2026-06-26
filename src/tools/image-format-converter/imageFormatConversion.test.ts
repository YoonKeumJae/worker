import { describe, expect, it, vi } from "vitest";
import {
  convertImageFormats,
  getImageFileName,
  selectImageFiles,
} from "./imageFormatConversion";

describe("imageFormatConversion", () => {
  it("returns selected image paths from the dialog", async () => {
    const openDialog = vi.fn().mockResolvedValue(["/tmp/a.png", "/tmp/b.jpg"]);

    await expect(selectImageFiles({ openDialog })).resolves.toEqual([
      "/tmp/a.png",
      "/tmp/b.jpg",
    ]);
    expect(openDialog).toHaveBeenCalledWith({
      title: "이미지 선택",
      multiple: true,
      filters: [
        {
          name: "이미지",
          extensions: [
            "heic",
            "heif",
            "jpeg",
            "jpg",
            "png",
            "webp",
          ],
        },
      ],
    });
  });

  it("returns an empty list when the dialog is cancelled", async () => {
    const openDialog = vi.fn().mockResolvedValue(null);

    await expect(selectImageFiles({ openDialog })).resolves.toEqual([]);
  });

  it("invokes the Tauri image conversion command", async () => {
    const convertedFiles = [
      {
        originalPath: "/tmp/a.png",
        outputPath: "/tmp/a.jpg",
        status: "converted" as const,
      },
    ];
    const invokeCommand = vi.fn().mockResolvedValue(convertedFiles);

    await expect(
      convertImageFormats(["/tmp/a.png"], "jpeg", { invokeCommand }),
    ).resolves.toEqual(convertedFiles);
    expect(invokeCommand).toHaveBeenCalledWith("convert_image_formats", {
      paths: ["/tmp/a.png"],
      targetFormat: "jpeg",
    });
  });

  it("extracts a file name from macOS and Windows style paths", () => {
    expect(getImageFileName("/Users/me/photo.png")).toBe("photo.png");
    expect(getImageFileName("C:\\Users\\me\\photo.jpg")).toBe("photo.jpg");
  });
});
