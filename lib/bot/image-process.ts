import sharp from "sharp";

const TARGET_WIDTH = 1280;
const WEBP_QUALITY = 80;

/** Ham görsel → 1280px genişlik WebP (Supabase yükleme öncesi) */
export async function processNewsImageBuffer(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: TARGET_WIDTH, withoutEnlargement: false })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

export async function fetchRemoteImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TRNETHABER-Bot/1.0" },
      signal: AbortSignal.timeout(20_000),
      redirect: "follow",
    });
    if (!res.ok) return null;

    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (mime && !/^image\/(jpeg|jpg|png|webp|gif|avif)$/i.test(mime)) {
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1_500 || buf.length > 12_000_000) return null;
    return buf;
  } catch (err) {
    console.warn("[image-process] fetch failed:", url, err);
    return null;
  }
}
