/**
 * Varlık slug ile haber slug eşleşmesi (semantik ağ — Faz 8 prototip).
 * Tam slug içerme veya ortak anlamlı token (5+ karakter) yeterli.
 */
export function articleSlugMatchesEntity(articleSlug: string, entitySlug: string): boolean {
  const a = articleSlug.toLowerCase();
  const e = entitySlug.toLowerCase();

  if (a.includes(e) || e.includes(a)) return true;

  const entityTokens = e.split("-").filter((t) => t.length >= 5);
  if (entityTokens.some((t) => a.includes(t))) return true;

  const articleTokens = a.split("-").filter((t) => t.length >= 5);
  return articleTokens.some((t) => e.includes(t));
}
