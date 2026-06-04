/** Yapay zekanın markdown işaretlerini ve geveze sohbet metinlerini temizler */
export function cleanGeminiJsonText(text: string): string {
  if (!text) return "";
  
  // 1. Önce markdown işaretlerini sil
  let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  
  // 2. Geveze metinleri atlayıp, sadece ilk '{' ile son '}' arasındaki asıl veriyi cımbızla
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  return cleaned;
}
