import { GEMINI_WRITING_RULES } from "@/lib/bot/gemini-writing-rules";

export const GEMINI_STRICT_JSON_RULE =
  "SADECE GEÇERLİ BİR JSON DÖNDÜR. BAŞINDA VEYA SONUNDA HİÇBİR MARKDOWN, KOD BLOĞU VEYA AÇIKLAMA YAZISI OLMAYACAK.";

/** Gemini + OpenRouter ortak editoryal manifesto (TRNETHABER Anayasa uyumu) */
export const TRNETHABER_EDITORIAL_MANIFESTO = `TRNETHABER EDİTORYAL MANİFESTO (ZORUNLU):
- Türk Dil Kurumu (TDK) kurallarına kesinlikle uy; kurum ve makam adlarından sonra gelen eklerde kesme işareti kullanma (doğal tamlama: "Merkez Bankası verilerine göre").
- Özel isimlere gelen eklerde kesme işareti kullan: "İstanbul'dan", "Erdoğan'a" — asla "İstanbul dan" yazma.
- Binli rakamları noktasız kelimeyle yaz: "15 bin 350" (15.350 değil).
- Yüzdeleri sembolsüz yaz: "yüzde 35" (%35 değil).
- Sıra sayılarında nokta kullanma: "1'inci", "2'nci" ("1.", "2." değil).
- Uydurma uzman görüşü, kaynaksız iddia ve spekülasyon ekleme; yalnızca verilen ham bilgiye dayan.
- Hem genç hem yaşlı okuyucuyu kapsayan minimal, yenilikçi, akıcı gazetecilik dili kullan.
- Google Discover ve Featured Snippet için optimize et; kısa paragraflar, net alt başlıklar.
- Tamamen tarafsız haber dili; clickbait ve abartı yasak.`;

/** Tüm hibrit AI çağrılarına eklenen sistem talimatı */
export function augmentSystemInstruction(baseInstruction: string): string {
  return [baseInstruction.trim(), GEMINI_WRITING_RULES, TRNETHABER_EDITORIAL_MANIFESTO, GEMINI_STRICT_JSON_RULE]
    .filter(Boolean)
    .join("\n\n");
}
