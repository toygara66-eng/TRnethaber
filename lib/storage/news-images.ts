/** Admin kapak görselleri — Supabase Storage bucket */
export const NEWS_IMAGES_BUCKET = "news-images";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const COVER_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

export function isAllowedCoverMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime.toLowerCase());
}

export function coverExtensionFromMime(mime: string): string | null {
  return EXT_BY_MIME[mime.toLowerCase()] ?? null;
}

export type NewsImageFolder = "covers" | "entities" | "site" | "inline";

const VALID_FOLDERS = new Set<NewsImageFolder>(["covers", "entities", "site", "inline"]);

export function normalizeNewsImageFolder(raw: string | null | undefined): NewsImageFolder {
  const value = raw?.trim().toLowerCase();
  if (value && VALID_FOLDERS.has(value as NewsImageFolder)) {
    return value as NewsImageFolder;
  }
  return "covers";
}

/** Çakışmayı önlemek için benzersiz depolama yolu */
export function buildUniqueNewsImagePath(
  mime: string,
  folder: NewsImageFolder = "covers",
): string | null {
  const ext = coverExtensionFromMime(mime);
  if (!ext) return null;
  const stamp = Date.now();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${stamp}-${Math.random().toString(36).slice(2, 10)}`;
  return `${folder}/${stamp}_${id}.${ext}`;
}

/** @deprecated buildUniqueNewsImagePath(mime, "covers") kullanın */
export function buildUniqueCoverImagePath(mime: string): string | null {
  return buildUniqueNewsImagePath(mime, "covers");
}

/** Public URL → bucket içi path (silme için) */
export function newsImagePathFromPublicUrl(publicUrl: string): string | null {
  try {
    const u = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${NEWS_IMAGES_BUCKET}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}
