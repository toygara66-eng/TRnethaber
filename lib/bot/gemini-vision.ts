import { getGeminiClient, GEMINI_MODEL, parseJsonObject } from "@/lib/bot/gemini-client";
import { isAllowedCoverUrl } from "@/lib/images/cover";

const VISION_SYSTEM = `Sen TRNETHABER görsel editörüsün.
Verilen haber bağlamı ile görselin alakasını değerlendir.
Alakasız stok fotoğraf, reklam, logo, meme veya tamamen farklı konu → relevant: false.
Sadece JSON: { "relevant": boolean, "reason": string }`;

type VisionJson = { relevant?: boolean; reason?: string };

async function fetchImageBytes(url: string): Promise<{ mime: string; data: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TRNETHABER-Bot/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mime)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2_000 || buf.length > 4_000_000) return null;
    return { mime, data: buf.toString("base64") };
  } catch {
    return null;
  }
}

async function checkImageRelevance(
  imageUrl: string,
  context: string,
): Promise<boolean> {
  const image = await fetchImageBytes(imageUrl);
  if (!image) return false;

  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: VISION_SYSTEM,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: image.mime,
          data: image.data,
        },
      },
      {
        text: `Haber bağlamı:\n${context.slice(0, 1200)}\n\nBu görsel haberle alakalı mı?`,
      },
    ]);

    const raw = result.response.text()?.trim();
    if (!raw) return false;
    const parsed = parseJsonObject<VisionJson>(raw);
    return parsed.relevant === true;
  } catch (err) {
    console.warn("[gemini-vision] relevance check failed:", imageUrl, err);
    return false;
  }
}

/**
 * Havuzdan alakalı görselleri seçer; vision kapalıysa URL doğrulamasıyla devam eder.
 */
export async function filterRelevantImages(
  candidates: string[],
  context: { title: string; keywords: string[]; summary: string },
  minNeeded: number,
): Promise<string[]> {
  const unique = Array.from(
    new Set(candidates.map((u) => u.trim()).filter(isAllowedCoverUrl)),
  );
  const contextText = `${context.title}\nAnahtar kelimeler: ${context.keywords.join(", ")}\n${context.summary}`;

  const useVision = process.env.GEMINI_VISION_FILTER !== "false";
  const accepted: string[] = [];

  for (const url of unique) {
    if (accepted.length >= minNeeded + 2) break;
    if (!useVision) {
      accepted.push(url);
      continue;
    }
    const ok = await checkImageRelevance(url, contextText);
    if (ok) accepted.push(url);
  }

  if (accepted.length >= minNeeded) return accepted.slice(0, minNeeded + 1);

  for (const url of unique) {
    if (accepted.includes(url)) continue;
    accepted.push(url);
    if (accepted.length >= minNeeded + 1) break;
  }

  return accepted;
}
