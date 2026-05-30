/** Gemini haber metni sistem promptlarına eklenecek format kuralı */
export const GEMINI_FORMAT_RULE = `KESİN FORMAT KURALI (ZORUNLU):
- Asla ve kesinlikle Markdown formatı kullanma.
- Metinleri kalınlaştırmak veya vurgulamak için yıldız (**) veya alt çizgi (_) KULLANMA.
- Vurgulaman gereken yerlerde normal tırnak işareti (" ") veya HTML <strong> etiketi kullan.`;

/** Gemini haber metni sistem promptlarına eklenecek imla kuralı */
export const GEMINI_TURKISH_SPELLING_RULE = `KESİN İMLA KURALI (ZORUNLU) — ÖZEL İSİM EKLERİ:
- Özel isim, kişi adı, yer adı ve parti adlarına gelen ekleri ASLA boşluk bırakarak ayırma.
- Bu eklerde MUTLAKA kesme işareti (') kullan.
- YANLIŞ örnekler (bunları ASLA yazma): "İstanbul dan", "Erdoğan a", "AK Parti İstanbul dan", "Murat Ülker den", "Picasso dan".
- DOĞRU örnekler (bunları uygula): "İstanbul'dan", "Erdoğan'a", "AK Parti İstanbul'dan", "Murat Ülker'den", "Picasso'dan".
- Başlık (title) ve özet (summary) dahil tüm metin alanlarında bu kural geçerlidir.
- Resmi kurum ve makam adlarına gelen eklerde kesme işareti kullanma; doğal Türkçe tamlama kullan (Örn: Merkez Bankası verilerine göre, Borsa İstanbul açıklamasına göre).`;

/** Tüm haber üretim promptlarında kullanılır */
export const GEMINI_WRITING_RULES = `${GEMINI_FORMAT_RULE}

${GEMINI_TURKISH_SPELLING_RULE}`;
