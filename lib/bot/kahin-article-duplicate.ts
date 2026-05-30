import {
  findDuplicateByTitleSimilar,
  type ArticleDuplicateCache,
} from "@/lib/bot/duplicate-check";
import { normalizeTitleKey } from "@/lib/bot/title-similarity";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugifyTitle } from "@/lib/slug";

function normalizePersonKey(name: string): string {
  return normalizeTitleKey(name);
}

/**
 * articles tablosunda aynı kişi (personName) zaten var mı?
 * Başlık, slug ve %90 benzer başlık kontrolü.
 */
export async function articleExistsForPersonName(
  personName: string,
  cache?: ArticleDuplicateCache,
): Promise<boolean> {
  const trimmed = personName.trim();
  if (!trimmed) return false;

  const key = normalizePersonKey(trimmed);
  const slugBase = slugifyTitle(trimmed);
  const kimdirSlug = slugBase ? `${slugBase}-kimdir` : "";
  const kimdirTitle = `${trimmed} Kimdir`;

  if (await findDuplicateByTitleSimilar(kimdirTitle, cache)) return true;
  if (await findDuplicateByTitleSimilar(trimmed, cache)) return true;

  const supabase = createSupabaseAdminClient();

  if (kimdirSlug) {
    const { data: byKimdirSlug } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", kimdirSlug)
      .maybeSingle();

    if (byKimdirSlug) return true;
  }

  const probe = key.length >= 8 ? key.slice(0, Math.min(32, key.length)) : key;
  if (probe.length < 3) return false;

  const { data: rows } = await supabase
    .from("articles")
    .select("title")
    .ilike("title", `%${probe}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  for (const row of rows ?? []) {
    if (!row.title) continue;
    const titleKey = normalizePersonKey(row.title);
    if (titleKey.includes(key) && /kimdir/i.test(row.title)) return true;
    if (titleKey === key) return true;
  }

  return false;
}
