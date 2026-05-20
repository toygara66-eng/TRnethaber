import { buildPicsumCoverUrl } from "@/lib/images/cover";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EntityUpsertResult, ExtractedEntity } from "@/lib/bot/types";

export async function upsertExtractedEntities(
  entities: ExtractedEntity[],
): Promise<EntityUpsertResult[]> {
  const supabase = createSupabaseAdminClient();
  const results: EntityUpsertResult[] = [];

  for (const entity of entities) {
    const { data: existing } = await supabase
      .from("entities")
      .select("id, slug")
      .eq("slug", entity.slug)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("entities")
        .update({
          anlik_durum_neden_gundemde: entity.anlik_durum_neden_gundemde,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        throw new Error(`Varlık güncellenemedi (${entity.slug}): ${error.message}`);
      }

      results.push({ slug: entity.slug, name: entity.name, action: "updated" });
      continue;
    }

    const { error } = await supabase.from("entities").insert({
      name: entity.name,
      slug: entity.slug,
      entity_type: entity.entity_type,
      bio_content: entity.bio_content,
      anlik_durum_neden_gundemde: entity.anlik_durum_neden_gundemde,
      image_url: entity.image_url ?? buildPicsumCoverUrl(entity.slug),
    });

    if (error) {
      if (error.code === "23505") {
        const { error: updateErr } = await supabase
          .from("entities")
          .update({ anlik_durum_neden_gundemde: entity.anlik_durum_neden_gundemde })
          .eq("slug", entity.slug);
        if (updateErr) {
          throw new Error(`Varlık yarış güncellemesi başarısız: ${updateErr.message}`);
        }
        results.push({ slug: entity.slug, name: entity.name, action: "updated" });
        continue;
      }
      throw new Error(`Varlık eklenemedi (${entity.slug}): ${error.message}`);
    }

    results.push({ slug: entity.slug, name: entity.name, action: "inserted" });
  }

  return results;
}
