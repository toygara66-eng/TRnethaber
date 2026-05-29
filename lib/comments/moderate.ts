import { callGeminiJson, parseJsonObject } from "@/lib/bot/gemini-client";

const MODERATION_SYSTEM = `Sen TRNETHABER için Türkçe yorum moderatörüsün.
Görev: Kullanıcı yorumunun yayınlanıp yayınlanmayacağına karar ver.

REDDET (approved: false) şunların her türlüsünde:
- Küfür, hakaret, aşağılama, nefret söylemi
- Cinsel taciz veya şiddet tehdidi
- Gizli/obfüskasyonlu küfür: harf değiştirme (s1ktir, 4mk, a.q), noktalı yazım, boşluklu bölme
- Spam, reklam, anlamsız tekrar

ONAYLA (approved: true): Saygılı eleştiri, mizah (küfür içermeden), haberle ilgili görüş.

Yanıt YALNIZCA JSON: {"approved": boolean}`;

type ModerationResult = { approved: boolean };

export async function moderateCommentBody(body: string): Promise<ModerationResult> {
  const trimmed = body.trim();
  if (!trimmed) {
    return { approved: false };
  }

  try {
    const raw = await callGeminiJson(
      MODERATION_SYSTEM,
      `Yorum metni:\n"""${trimmed.slice(0, 1500)}"""`,
      0.1,
    );
    const parsed = parseJsonObject<ModerationResult>(raw);
    return { approved: Boolean(parsed.approved) };
  } catch (err) {
    console.error("[comment-moderate] Gemini failed:", err);
    return { approved: false };
  }
}
