import { GEMINI_WRITING_RULES } from "@/lib/bot/gemini-writing-rules";
import { TRNETHABER_MASTER_PROTOCOL } from "@/lib/bot/turkey-news-focus";

export const GEMINI_STRICT_JSON_RULE =
  "SADECE GEÇERLİ BİR JSON DÖNDÜR. BAŞINDA VEYA SONUNDA HİÇBİR MARKDOWN, KOD BLOĞU VEYA AÇIKLAMA YAZISI OLMAYACAK.";

import { GEMINI_SUMMARY_SPOT_RULE } from "@/lib/articles/summary-text";

/** Gemini + OpenRouter ortak editoryal manifesto (TRNETHABER Anayasa uyumu) */
export const TRNETHABER_EDITORIAL_MANIFESTO = `TRNETHABER EDİTORYAL MANİFESTO (ZORUNLU):
- Türk Dil Kurumu (TDK) kurallarına kesinlikle uy.
- Kurum ve makam adlarından sonra gelen eklerde kesme işareti KULLANMA; ek bitişik ve doğal yazılır (ör. Türkiye Büyük Millet Meclisine, Yozgat Valiliğine — "Meclis'ine" veya "Valiliği'ne" YANLIŞ).
- Özel isimlere gelen eklerde kesme işareti kullan: "İstanbul'dan", "Erdoğan'a" — asla "İstanbul dan" yazma.
- Binli rakamları noktasız kelimeyle yaz: "15 bin 350" (15.350 veya 15.000 değil).
- Yüzdeleri sembolsüz yaz: "yüzde 35" (%35 değil).
- Sıra sayılarında nokta kullanma: "1'inci", "2'nci" ("1.", "2." değil).
- Uydurma uzman görüşü, kaynaksız iddia ve spekülasyon ekleme; yalnızca verilen ham bilgiye dayan.
- Hem genç hem yaşlı okuyucuyu kapsayan minimal, yenilikçi, akıcı gazetecilik dili kullan.
- Google Discover ve Featured Snippet için optimize et; kısa paragraflar, net alt başlıklar.
- Tamamen tarafsız haber dili; clickbait ve abartı yasak.

${GEMINI_SUMMARY_SPOT_RULE}

${TRNETHABER_MASTER_PROTOCOL}`;

export type AugmentSystemOptions = {
  /** news-bot: manifesto ve uzun yazım kuralları eklenmez */
  lite?: boolean;
};

/** Tüm hibrit AI çağrılarına eklenen sistem talimatı */
export function augmentSystemInstruction(
  baseInstruction: string,
  options?: AugmentSystemOptions,
): string {
  if (options?.lite) {
    return [baseInstruction.trim(), TRNETHABER_MASTER_PROTOCOL, GEMINI_STRICT_JSON_RULE]
      .filter(Boolean)
      .join("\n\n");
  }
  return [baseInstruction.trim(), GEMINI_WRITING_RULES, TRNETHABER_EDITORIAL_MANIFESTO, GEMINI_STRICT_JSON_RULE]
    .filter(Boolean)
    .join("\n\n");
}
