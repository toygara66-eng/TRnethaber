/** ```json ... ``` markdown sarmalayıcılarını kaldırır */
export function cleanGeminiJsonText(text: string): string {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

export function parseJsonObject<T extends Record<string, unknown>>(raw: string): T {
  const cleanedText = cleanGeminiJsonText(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedText);
  } catch {
    throw new Error("AI JSON çıktısı ayrıştırılamadı");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI yanıtı geçerli bir JSON nesnesi değil");
  }
  return parsed as T;
}
