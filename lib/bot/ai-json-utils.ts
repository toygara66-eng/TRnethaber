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

  // 3. Sondaki parantezleri bul
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const endIdx = Math.max(lastBrace, lastBracket);
  
  // 4. Geçerli bir başlangıç ve bitiş varsa o aralığı cımbızla
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  } else if (startIdx !== -1) {
    // DİKKAT: Bitiş parantezi yoksa bile (metin yarıda kesilmişse) 
    // en azından baştaki geveze giriş cümlelerini atıp veriyi koruyalım.
    cleaned = cleaned.substring(startIdx);
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
    // DEDİKTİF MODU 2.0: Yarıda kesilme (Truncation) tespiti!
    // Eğer temizlenmiş metin bir kapanış parantezi ile bitmiyorsa, AI'nin limiti yetmemiştir.
    const isTruncated = !cleanedText.trim().endsWith('}') && !cleanedText.trim().endsWith(']');
    
    let errorMessage = "AI JSON çıktısı ayrıştırılamadı.";
    if (isTruncated) {
      errorMessage = "🚨 KRİTİK HATA: Yapay zekanın yanıtı yarıda kesilmiş! Cümlenin sonu '}' ile kapanmıyor. Lütfen haber botunun çalıştığı dosyadaki 'maxOutputTokens' limitini (örn: 1500) artırın!";
    }

    // Ekranı çok doldurmamak için metnin ilk ve son kısımlarını logluyoruz.
    const previewStart = cleanedText.substring(0, 100).replace(/\n/g, " ");
    const previewEnd = cleanedText.length > 100 ? cleanedText.substring(cleanedText.length - 100).replace(/\n/g, " ") : "";
    
    throw new Error(`${errorMessage} | BAŞI: ${previewStart}... | SONU: ...${previewEnd}`);
  }
  
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI yanıtı geçerli bir JSON nesnesi değil. Gelen Metin: " + cleanedText.substring(0, 300));
  }
  
  return parsed as T;
}
