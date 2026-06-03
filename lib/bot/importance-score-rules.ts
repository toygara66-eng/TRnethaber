/** Ana haber botu — Gemini JSON importance_score (1-10) */
export const GEMINI_IMPORTANCE_SCORE_RULE = `ÖNEM PUANI (ZORUNLU):
Gelen haberin Türkiye veya dünya gündemi için önem derecesini 1 ile 10 arasında "importance_score" olarak değerlendir.
- 8-10: Ülkeyi sarsan son dakika, büyük afet, kritik siyasi karar, tüm ulusu ilgilendiren dev olay.
- 5-7: Önemli ama ana manşet olmayan gelişmeler (ekonomi, spor, bölgesel kritik haber).
- 1-4: Günlük haber, magazin, yerel kaza, rutin açıklama.
JSON çıktısına mutlaka "importance_score": number (tam sayı 1-10) ekle.`;
