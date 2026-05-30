/** Gemini haber metni sistem promptlarına eklenecek format kuralı */
export const GEMINI_FORMAT_RULE = `KESİN FORMAT KURALI (ZORUNLU):
- Asla ve kesinlikle Markdown formatı kullanma.
- Metinleri kalınlaştırmak veya vurgulamak için yıldız (**) veya alt çizgi (_) KULLANMA.
- Vurgulaman gereken yerlerde normal tırnak işareti (" ") veya HTML <strong> etiketi kullan.`;

/** Gemini haber metni sistem promptlarına eklenecek imla kuralı */
export const GEMINI_TURKISH_SPELLING_RULE = `KESİN İMLA KURALI (ZORUNLU):
- Türkçe dilbilgisi ve yazım kurallarına KUSURSUZ bir şekilde uy.
- Özel isimlere gelen ekleri MUTLAKA kesme işareti (') ile ayır (Örn: Doğru -> Murat Ülker'den, Picasso'dan. Yanlış -> Murat Ülker den, Picasso dan).
- Kesme işareti koyman gereken yerlerde asla sadece boşluk bırakma.
- Resmi kurum ve makam adlarına gelen eklerde kesme işareti kullanma; doğal Türkçe tamlama kullan (Örn: Merkez Bankası verilerine göre).`;

/** Tüm haber üretim promptlarında kullanılır */
export const GEMINI_WRITING_RULES = `${GEMINI_FORMAT_RULE}

${GEMINI_TURKISH_SPELLING_RULE}`;
