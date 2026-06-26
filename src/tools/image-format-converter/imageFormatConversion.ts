import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export type ImageFormatConversionTarget =
  | "png"
  | "jpeg"
  | "heic"
  | "webp";

export type ConvertedImageFile = {
  originalPath: string;
  outputPath: string;
  status: "converted" | "skipped";
};

type ImageOpenDialogOptions = Parameters<typeof open>[0];

export type SelectImageFilesDeps = {
  openDialog: (
    options: ImageOpenDialogOptions,
  ) => Promise<string | string[] | null>;
};

export type ConvertImageFormatsDeps = {
  invokeCommand: (
    command: "convert_image_formats",
    args: {
      paths: string[];
      targetFormat: ImageFormatConversionTarget;
    },
  ) => Promise<ConvertedImageFile[]>;
};

export async function selectImageFiles(
  deps: SelectImageFilesDeps = defaultSelectImageFilesDeps,
): Promise<string[]> {
  const selectedPaths = await deps.openDialog({
    title: "이미지 선택",
    multiple: true,
    filters: [
      {
        name: "이미지",
        extensions: ["heic", "heif", "jpeg", "jpg", "png", "webp"],
      },
    ],
  });

  if (selectedPaths === null) {
    return [];
  }

  if (Array.isArray(selectedPaths)) {
    return selectedPaths;
  }

  return [selectedPaths];
}

export async function convertImageFormats(
  paths: string[],
  targetFormat: ImageFormatConversionTarget,
  deps: ConvertImageFormatsDeps = defaultConvertImageFormatsDeps,
): Promise<ConvertedImageFile[]> {
  return deps.invokeCommand("convert_image_formats", {
    paths,
    targetFormat,
  });
}

export function getImageFileName(path: string): string {
  return path.split(/[\\/]/).at(-1) ?? path;
}

const defaultSelectImageFilesDeps: SelectImageFilesDeps = {
  openDialog: open,
};

const defaultConvertImageFormatsDeps: ConvertImageFormatsDeps = {
  invokeCommand: (command, args) => invoke<ConvertedImageFile[]>(command, args),
};
