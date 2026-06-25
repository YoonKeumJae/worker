export type QrCodeFileExtension = "png" | "svg";

export function createQrCodeFileName(
  urlValue: string,
  extension: QrCodeFileExtension,
): string {
  const urlSlug = createQrCodeUrlSlug(urlValue);

  return `${urlSlug || "url"}-qr.${extension}`;
}

export function createQrCodeUrlSlug(urlValue: string): string {
  const normalizedUrl = normalizeFileNameUrlValue(urlValue).toLowerCase();

  return Array.from(normalizedUrl)
    .map((character) => (isUnsafeFileNameCharacter(character) ? "-" : character))
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeFileNameUrlValue(urlValue: string): string {
  try {
    return new URL(urlValue).href;
  } catch {
    return urlValue;
  }
}

function isUnsafeFileNameCharacter(character: string): boolean {
  const characterCode = character.charCodeAt(0);

  return (
    characterCode <= 31 ||
    characterCode === 127 ||
    character === "/" ||
    character === "\\" ||
    character === ":" ||
    character === "*" ||
    character === "?" ||
    character === '"' ||
    character === "<" ||
    character === ">" ||
    character === "|"
  );
}
