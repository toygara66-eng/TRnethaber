import { findDuplicateByTitleSimilar } from "@/lib/bot/duplicate-check";
import type { City } from "@/lib/data/cities";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SEYAHAT_CATEGORY_SLUG } from "@/lib/bot/sehir-rehberi-gemini";

export function buildSehirRehberiSlug(city: City): string {
  return `${city.slug}-gezi-rehberi`;
}

/** Bu il için seyahat/gezi rehberi articles kaydı var mı? */
export async function sehirRehberiExistsForCity(city: City): Promise<boolean> {
  const slug = buildSehirRehberiSlug(city);
  const supabase = createSupabaseAdminClient();

  const { data: bySlug } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (bySlug) return true;

  const titleProbe = `${city.name} Gezi Rehberi`;
  if (await findDuplicateByTitleSimilar(titleProbe)) return true;

  const { data: byCityCol } = await supabase
    .from("articles")
    .select("id")
    .ilike("city", city.name)
    .ilike("title", "%Gezi Rehberi%")
    .limit(1);

  if (byCityCol && byCityCol.length > 0) return true;

  const { data: byTitle } = await supabase
    .from("articles")
    .select("id")
    .ilike("title", `%${city.name}%`)
    .ilike("title", "%Gezi Rehberi%")
    .limit(3);

  if (byTitle && byTitle.length > 0) return true;

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", SEYAHAT_CATEGORY_SLUG)
    .maybeSingle();

  if (!category?.id) return false;

  const { data: inSeyahat } = await supabase
    .from("articles")
    .select("id, title")
    .eq("category_id", category.id)
    .ilike("title", `%${city.name}%`)
    .limit(5);

  return (inSeyahat ?? []).some((row) =>
    row.title ? /gezi\s*rehberi/i.test(row.title) : false,
  );
}
