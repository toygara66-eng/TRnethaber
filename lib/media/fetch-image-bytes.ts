/** Görsel URL → base64 (Gemini Vision için) */

export async function fetchImageBytesForVision(
  url: string,
): Promise<{ mime: string; data: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TRNETHABER-Bot/1.0" },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    if (!res.ok) return null;

    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(mime)) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 800 || buf.length > 4_500_000) return null;

    return { mime, data: buf.toString("base64") };
  } catch {
    return null;
  }
}
