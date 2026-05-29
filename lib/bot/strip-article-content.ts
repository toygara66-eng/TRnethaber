/**
 * Makale gövdesi (content) — veritabanına yazılmadan hemen önce uygulanır.
 * Kapak görseli (kapak_gorseli) bu fonksiyondan geçmez.
 */
export function stripArticleContentForPersist(icerik: string): string {
  let out = icerik ?? "";

  out = out.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, "");
  out = out.replace(/<picture[^>]*>[\s\S]*?<\/picture>/gi, "");
  out = out.replace(/<img[^>]*>/gi, "");
  out = out.replace(/!\[.*?\]\(.*?\)/g, "");

  // Ek güvenlik: kapanmayan / legacy inline kalıntılar
  out = out.replace(/<figure[^>]*>[\s\S]*/gi, "");
  out = out.replace(/<picture[^>]*>[\s\S]*/gi, "");
  out = out.replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/gi, "");
  out = out.replace(/<svg[\s\S]*?<\/svg>/gi, "");
  out = out.replace(/<video[\s\S]*?<\/video>/gi, "");
  out = out.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  out = out.replace(/<source[^>]*\/?>/gi, "");
  out = out.replace(
    /<div[^>]*class=["'][^"']*article-inline-image[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    "",
  );

  out = out.replace(/<p>\s*(?:&nbsp;|\u00a0|\s)*<\/p>/gi, "");
  out = out.replace(/\n{3,}/g, "\n\n");

  return out.trim();
}

/** Gemini sistem promptlarına eklenecek zorunlu görsel yasağı */
export const GEMINI_NO_BODY_IMAGES_RULE = `GÖRSEL YASAĞI (ZORUNLU):
- Asla ve kesinlikle metnin içine görsel (img, picture, figure) ekleme.
- blocks içinde HTML görsel etiketi, Markdown görsel sözdizimi (![...](...)) veya gövdeye görsel URL'si kullanma.
- Sadece saf metin blokları üret (p, h2, ul, li); vurgu için yalnızca <strong> kullanılabilir.
- Kapak görseli sistem tarafından ayrı eklenir; sen ekleme.`;
