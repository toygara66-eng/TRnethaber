/** Ana haber botu (news-bot) Gemini JSON çıktısı — manşet analizi */
export const GEMINI_MANSET_ANALYSIS_RULE = `MANŞET ANALİZİ (ZORUNLU):
Gelen haberin Türkiye veya Dünya gündemi için önem derecesini analiz et. Eğer bu haber ülkeyi sarsacak bir son dakika gelişmesi, büyük bir doğal afet, çok kritik bir siyasi karar veya tüm ulusu ilgilendiren devasa bir olaysa JSON çıktısına "is_manset": true değerini ekle. Eğer sıradan bir günlük haber, magazin, yerel kaza veya standart bir açıklamaysa "is_manset": false yap.`;

export function parseGeminiIsManset(raw: unknown): boolean {
  if (raw === true) return true;
  if (raw === false) return false;
  if (typeof raw === "string") {
    const n = raw.trim().toLowerCase();
    if (n === "true" || n === "1" || n === "evet") return true;
    if (n === "false" || n === "0" || n === "hayir" || n === "hayır") return false;
  }
  return false;
}
