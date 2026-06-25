export type QrCodeFileExtension = "png" | "svg";

const qrCodeFileNameMaxLength = 240;
const stableHashLength = 8;

export function createQrCodeFileName(
  urlValue: string,
  extension: QrCodeFileExtension,
): string {
  const urlSlug = createQrCodeUrlSlug(urlValue, extension);

  return `${urlSlug}-qr.${extension}`;
}

export function createQrCodeUrlSlug(
  urlValue: string,
  extension: QrCodeFileExtension,
): string {
  const normalizedUrl = normalizeFileNameUrlValue(urlValue);
  const safeUrl = createSafeFileNameUrlValue(normalizedUrl);
  const visibleSlug = slugifyFileNameValue(safeUrl.value);
  const suffixLength = `-qr.${extension}`.length;
  const maxSlugLength = qrCodeFileNameMaxLength - suffixLength;

  if (visibleSlug.length === 0 && !safeUrl.needsHash) {
    return "url";
  }

  if (visibleSlug.length > 0 && visibleSlug.length <= maxSlugLength && !safeUrl.needsHash) {
    return visibleSlug;
  }

  const hash = createStableUrlHash(normalizedUrl);
  const hashSuffixLength = hash.length + 1;
  const maxVisibleSlugLength = maxSlugLength - hashSuffixLength;
  const boundedVisibleSlug = trimSlug(
    (visibleSlug || "url").slice(0, maxVisibleSlugLength),
  );

  return `${boundedVisibleSlug || "url"}-${hash}`;
}

function slugifyFileNameValue(value: string): string {
  return trimSlug(
    Array.from(value.toLowerCase())
      .map((character) =>
        isUnsafeFileNameCharacter(character) ? "-" : character,
      )
      .join("")
      .replace(/-+/g, "-"),
  );
}

function trimSlug(slug: string): string {
  return slug.replace(/^-+|-+$/g, "");
}

function normalizeFileNameUrlValue(urlValue: string): string {
  try {
    return new URL(urlValue).href;
  } catch {
    return urlValue;
  }
}

function createSafeFileNameUrlValue(urlValue: string): {
  value: string;
  needsHash: boolean;
} {
  try {
    const parsedUrl = new URL(urlValue);
    const hasCredentials =
      parsedUrl.username.length > 0 || parsedUrl.password.length > 0;
    const hasSearch = parsedUrl.search.length > 0;
    const hasHash = parsedUrl.hash.length > 0;

    parsedUrl.username = "";
    parsedUrl.password = "";

    if (hasSearch) {
      parsedUrl.search = "?query";
    }

    if (hasHash) {
      parsedUrl.hash = "#fragment";
    }

    return {
      value: parsedUrl.href,
      needsHash: hasCredentials || hasSearch || hasHash,
    };
  } catch {
    return {
      value: urlValue,
      needsHash: false,
    };
  }
}

function createStableUrlHash(value: string): string {
  let hash = 0x811c9dc5;

  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36).padStart(stableHashLength, "0").slice(0, stableHashLength);
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
