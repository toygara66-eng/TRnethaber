/** Yapay zekanın markdown işaretlerini ve geveze sohbet metinlerini temizler */
export function cleanGeminiJsonText(text: string): string {
  if (!text) return "";
  
  // 1. Önce markdown işaretlerini sil
  let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  
  // 2. Hem süslü { } hem köşeli [ ] parantez ihtimallerini ara
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else {
    startIdx = Math.max(firstBrace, firstBracket);
  }

  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const endIdx = Math.max(lastBrace, lastBracket);
  
  // 3. Geçerli bir başlangıç ve bitiş varsa o aralığı cımbızla
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }
  
  return cleaned;
}

/** Temizlenmiş metni güvenli bir şekilde JSON objesine dönüştürür */
export function parseJsonObject<T extends Record<string, unknown>>(raw: string): T {
  const cleanedText = cleanGeminiJsonText(raw);
  let parsed: unknown;
  
  try {
    parsed = JSON.parse(cleanedText);
  } catch (err) {
    // DEDİKTİF MODU: Hatayı fırlatırken AI'nin bize gönderdiği bozuk metni de ekrana yazdırıyoruz!
    // Kısaltarak (ilk 300 karakter) yazdırıyoruz ki ekran çok dolmasın.
    const previewText = cleanedText.substring(0, 300);
    throw new Error(`AI JSON çıktısı ayrıştırılamadı. Gelen Metin: ${previewText}...`);
  }
  
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI yanıtı geçerli bir JSON nesnesi değil. Gelen Metin: " + cleanedText.substring(0, 300));
  }
  
  return parsed as T;
}
