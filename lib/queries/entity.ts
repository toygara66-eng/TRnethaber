import { resolveViewCountLabel } from "@/lib/articles/labels";
import { coverImageAlt } from "@/lib/bot/cover-image";
import { resolveCoverImageSrc } from "@/lib/images/cover";
import { articleSlugMatchesEntity } from "@/lib/entity/match-articles";
import { createSupabaseClient } from "@/lib/supabase";
import type { ArticleRow, EntityRow } from "@/lib/supabase/rows";
import type { EntityDetail, EntityRelatedCard, EntityType } from "@/lib/types/entity";

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  kisi: "Kişi",
  takim: "Takım",
  kurum: "Kurum",
};

const ENTITY_SELECT = `
  id,
  name,
  slug,
  entity_type,
  bio_content,
  image_url,
  anlik_durum_neden_gundemde
`;

const RELATED_ARTICLE_SELECT = `
  id,
  title,
  slug,
  spot_metni,
  kapak_gorseli,
  okuma_sayisi,
  published_at,
  created_at,
  categories (
    slug,
    name
  )
`;

function resolveCategory(row: ArticleRow) {
  const c = row.categories;
  if (!c) return null;
  return Array.isArray(c) ? c[0] ?? null : c;
}

function mapEntityDetail(row: EntityRow): EntityDetail {
  const imageSrc = resolveCoverImageSrc(row.image_url);
  return {
    slug: row.slug,
    name: row.name,
    entityType: row.entity_type,
    entityTypeLabel: ENTITY_TYPE_LABELS[row.entity_type],
    bioContent: row.bio_content,
    spotlightReason: row.anlik_durum_neden_gundemde,
    imageSrc,
    imageAlt: coverImageAlt(row.name),
  };
}

function mapRelatedCard(row: ArticleRow): EntityRelatedCard {
  const cat = resolveCategory(row);
  return {
    slug: row.slug,
    title: row.title,
    category: cat?.name ?? "",
    categorySlug: cat?.slug ?? "",
    imageSrc: resolveCoverImageSrc(row.kapak_gorseli),
    imageAlt: coverImageAlt(row.title),
    readCountLabel: resolveViewCountLabel(row.okuma_sayisi, row.slug),
  };
}

export async function getEntityBySlug(slug: string): Promise<EntityDetail | null> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("entities")
      .select(ENTITY_SELECT)
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("[getEntityBySlug]", error);
      return null;
    }

    return mapEntityDetail(data as EntityRow);
  } catch (err) {
    console.error("[getEntityBySlug]", err);
    return null;
  }
}

export async function getAllEntitySlugs(): Promise<string[]> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from("entities").select("slug");
    if (error || !data) return [];
    return data.map((r) => r.slug);
  } catch {
    return [];
  }
}

export async function getRelatedArticlesForEntity(
  entitySlug: string,
  limit = 6,
): Promise<EntityRelatedCard[]> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("articles")
      .select(RELATED_ARTICLE_SELECT)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(40);

    if (error || !data) {
      if (error) console.error("[getRelatedArticlesForEntity]", error);
      return [];
    }

    return (data as ArticleRow[])
      .filter((row) => articleSlugMatchesEntity(row.slug, entitySlug))
      .slice(0, limit)
      .map(mapRelatedCard);
  } catch (err) {
    console.error("[getRelatedArticlesForEntity]", err);
    return [];
  }
}
