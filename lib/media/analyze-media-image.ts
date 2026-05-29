import { getGeminiClient, GEMINI_MODEL, parseJsonObject } from "@/lib/bot/gemini-client";
import { fetchImageBytesForVision } from "@/lib/media/fetch-image-bytes";

const TAGGING_SYSTEM = `Sen bir haber sitesi medya kütüphanesi editörüsün.
Verilen fotoğrafı incele ve SEO uyumlu metadata üret.

Kurallar:
- alt_text: Türkçe, kısa, açıklayıcı, en fazla 125 karakter; "görsel" veya "fotoğraf" ile bitirme
- tags: tam 5 adet Türkçe anahtar kelime (küçük harf, tek kelime veya kısa ikili ifade, # yok)
- tags jenerik olmasın (resim, foto, haber gibi tek başına yasak)

Yalnızca JSON:
{ "alt_text": "...", "tags": ["...", "...", "...", "...", "..."] }`;

type TaggingJson = {
  alt_text?: string;
  tags?: string[];
};

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) =>
      t
        .trim()
        .toLowerCase()
        .replace(/^#+/, "")
        .slice(0, 48),
    )
    .filter((t) => t.length > 1 && !/^(gorsel|foto|resim|image|photo)$/i.test(t))
    .slice(0, 5);
}

export async function analyzeMediaImageWithGemini(imageUrl: string): Promise<{
  alt_text: string;
  tags: string[];
}> {
  if (process.env.MEDIA_TAGGING_ENABLED === "false") {
    return { alt_text: "", tags: [] };
  }

  const image = await fetchImageBytesForVision(imageUrl);
  if (!image) {
    throw new Error("Görsel indirilemedi veya format desteklenmiyor");
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: TAGGING_SYSTEM,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.25,
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
      text: "Bu fotoğrafı incele, SEO uyumlu kısa bir alt_text yaz ve bu resmi tanımlayacak 5 adet keyword (tags) çıkar.",
    },
  ]);

  const raw = result.response.text()?.trim();
  if (!raw) {
    throw new Error("Gemini boş yanıt döndü");
  }

  const parsed = parseJsonObject<TaggingJson>(raw);
  const alt_text = (parsed.alt_text ?? "").trim().slice(0, 125);
  const tags = normalizeTags(parsed.tags);

  return { alt_text, tags };
}
