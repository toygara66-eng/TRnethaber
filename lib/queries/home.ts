import { filterPublishedRows, isRowPublished } from "@/lib/articles/publish";
import { isEligibleForNationalHeadline } from "@/lib/home/headline-eligibility";
import { coerceViewCount, isMissingViewCountColumn } from "@/lib/articles/view-count-db";
import { safeText } from "@/lib/safe-display";
import { HOME_VITRIN_SLUGS } from "@/lib/data/nav-categories";
import { resolveCoverImageSrc } from "@/lib/images/cover";
import {
  filterTopLevelCategories,
  isMissingDbColumn,
} from "@/lib/queries/categories-shared";
import { createSupabaseClient } from "@/lib/supabase";
import type { ArticleRow, CategoryRow } from "@/lib/supabase/rows";
import type {
  CategorySection,
  HomeCard,
  HomeHeroSlide,
  HomePageData,
} from "@/lib/types/home";

export type HomePageResult = HomePageData & {
  status: "ok" | "empty" | "error";
  errorMessage?: string;
};

const ARTICLE_SELECT = `
  id,
  title,
  slug,
  spot_metni,
  kapak_gorseli,
  view_count,
  is_breaking,
  published_at,
  category_id,
  categories (
    id,
    slug,
    name
  )
`;

const ARTICLE_PLAIN_SELECT = `
  id,
  title,
  slug,
  spot_metni,
  kapak_gorseli,
  view_count,
  is_breaking,
  published_at,
  created_at,
  category_id
`;

function resolveCategory(
  row: ArticleRow,
  categoryMap: Map<string, CategoryRow>,
): CategoryRow | null {
  const embedded = row.categories;
  if (embedded) {
    return Array.isArray(embedded) ? embedded[0] ?? null : embedded;
  }
  if (row.category_id) {
    return categoryMap.get(row.category_id) ?? null;
  }
  return null;
}

function coverAlt(title: string): string {
  return `${title} kapak görseli, soyut, yüz ve yazı yok`;
}

function toHeroSlide(row: ArticleRow, categoryMap: Map<string, CategoryRow>): HomeHeroSlide {
  const cat = resolveCategory(row, categoryMap);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    dek: row.spot_metni ?? "",
    category: cat?.name ?? "",
    imageSrc: resolveCoverImageSrc(row.kapak_gorseli),
    imageAlt: coverAlt(row.title),
  };
}

function toHomeCard(row: ArticleRow, categoryMap: Map<string, CategoryRow>): HomeCard {
  const cat = resolveCategory(row, categoryMap);
  const title = safeText(row.title, "Haber");
  return {
    id: safeText(row.id, row.slug ?? "card"),
    slug: safeText(row.slug, "haber"),
    title,
    dek: safeText(row.spot_metni),
    category: safeText(cat?.name, "Gündem"),
    categorySlug: safeText(cat?.slug, "gundem"),
    viewCount: coerceViewCount((row as ArticleRow & { view_count?: unknown }).view_count),
    imageSrc: resolveCoverImageSrc(row.kapak_gorseli),
    imageAlt: coverAlt(title),
    hasCoverImage: Boolean(row.kapak_gorseli?.trim()),
  };
}

function formatSupabaseError(err: { message?: string; code?: string; details?: string }): string {
  const msg = err.message ?? "Bilinmeyen hata";
  if (msg.includes("fetch failed") || msg.includes("ENOTFOUND")) {
    const envUrl =
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const host = envUrl ? new URL(envUrl).hostname : "";
    return host
      ? `Supabase adresi çözümlenemedi (${host}). Dashboard → Settings → API bölümünden Project URL ve anon/publishable key değerlerini yeniden kopyalayıp .env.local dosyasını güncelleyin. Proje duraklatılmışsa Restore project yapın. Teşhis: npm run db:check`
      : "Supabase sunucusuna ulaşılamıyor. .env.local içindeki Project URL ve API anahtarını kontrol edin.";
  }
  if (err.code === "PGRST200" || msg.includes("relationship")) {
    return "Veritabanı ilişki hatası. schema.sql dosyasının tamamının çalıştığından emin olun.";
  }
  return msg;
}

function buildCategoryMap(cats: CategoryRow[]): Map<string, CategoryRow> {
  return new Map(cats.map((c) => [c.id, c]));
}

const ARTICLE_SELECT_NO_VIEW = `
  id,
  title,
  slug,
  spot_metni,
  kapak_gorseli,
  is_breaking,
  published_at,
  category_id,
  categories (
    id,
    slug,
    name
  )
`;

async function fetchArticlesWithoutViewCount(
  supabase: ReturnType<typeof createSupabaseClient>,
  categoryMap: Map<string, CategoryRow>,
): Promise<{ rows: ArticleRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT_NO_VIEW)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (error) {
    return { rows: [], error: formatSupabaseError(error) };
  }

  const rows = (data ?? []).filter((r) => isRowPublished(r)) as ArticleRow[];
  return { rows, error: null };
}

async function fetchArticles(
  supabase: ReturnType<typeof createSupabaseClient>,
  categoryMap: Map<string, CategoryRow>,
): Promise<{ rows: ArticleRow[]; error: string | null }> {
  let { data, error } = await filterPublishedRows(
    supabase.from("articles").select(ARTICLE_SELECT),
  ).order("published_at", { ascending: false });

  if (error?.message && isMissingViewCountColumn(error.message)) {
    return fetchArticlesWithoutViewCount(supabase, categoryMap);
  }

  if (!error && data) {
    const rows = (data as ArticleRow[]).filter((r) => isRowPublished(r));
    return { rows, error: null };
  }

  let plain = await filterPublishedRows(
    supabase.from("articles").select(ARTICLE_PLAIN_SELECT),
  ).order("created_at", { ascending: false });

  if (plain.error) {
    return { rows: [], error: formatSupabaseError(plain.error) };
  }

  const rows = (plain.data ?? [])
    .map((row) => ({
      ...row,
      categories: row.category_id ? categoryMap.get(row.category_id) ?? null : null,
    }))
    .filter((r) => isRowPublished(r)) as ArticleRow[];

  return { rows, error: null };
}

function buildResult(
  cats: CategoryRow[],
  rows: ArticleRow[],
  categoryMap: Map<string, CategoryRow>,
): HomePageResult {
  const breakingTicker = rows
    .filter((a) => a.is_breaking)
    .map((a) => `SON DAKİKA · ${a.title}`);

  const heroSlides = rows
    .filter((a) => Boolean(a.kapak_gorseli))
    .filter((a) => {
      const cat = resolveCategory(a, categoryMap);
      return isEligibleForNationalHeadline({
        categorySlug: cat?.slug,
        title: a.title,
        summary: a.spot_metni,
      });
    })
    .slice(0, 3)
    .map((r) => toHeroSlide(r, categoryMap));

  const primaryCats = HOME_VITRIN_SLUGS.map((slug) => cats.find((c) => c.slug === slug)).filter(
    (c): c is CategoryRow => Boolean(c),
  );

  const categorySections: CategorySection[] = primaryCats.map((cat) => ({
    slug: cat.slug,
    label: cat.name,
    cards: rows
      .filter((a) => resolveCategory(a, categoryMap)?.slug === cat.slug)
      .slice(0, 3)
      .map((r) => toHomeCard(r, categoryMap)),
  }));

  const hasContent = heroSlides.length > 0 || categorySections.some((s) => s.cards.length > 0);

  return {
    breakingTicker,
    heroSlides,
    categorySections,
    status: hasContent ? "ok" : "empty",
    errorMessage: hasContent
      ? undefined
      : "Haber kaydı bulunamadı. Supabase Table Editor'de articles tablosunu kontrol edin veya seed.sql çalıştırın. Bağlantı için: npm run db:check",
  };
}

export async function getBreakingTickerItems(): Promise<string[]> {
  const result = await getHomePageData();
  return result.breakingTicker;
}

export async function getHomePageData(): Promise<HomePageResult> {
  const emptyError = (message: string): HomePageResult => ({
    breakingTicker: [],
    heroSlides: [],
    categorySections: [],
    status: "error",
    errorMessage: message,
  });

  try {
    const supabase = createSupabaseClient();

    let cats: CategoryRow[] = [];
    const withParent = await supabase
      .from("categories")
      .select("id, slug, name, parent_id")
      .is("parent_id", null)
      .order("name");

    if (!withParent.error && withParent.data) {
      cats = withParent.data as CategoryRow[];
    } else if (isMissingDbColumn(withParent.error, "parent_id")) {
      const plain = await supabase.from("categories").select("id, slug, name").order("name");
      if (plain.error) {
        return emptyError(formatSupabaseError(plain.error));
      }
      cats = filterTopLevelCategories((plain.data ?? []) as CategoryRow[]);
    } else if (withParent.error) {
      return emptyError(formatSupabaseError(withParent.error));
    }
    const categoryMap = buildCategoryMap(cats);

    const { rows, error: artError } = await fetchArticles(supabase, categoryMap);

    if (artError && rows.length === 0) {
      return emptyError(artError);
    }

    const result = buildResult(cats, rows, categoryMap);
    if (artError && result.status === "empty") {
      result.errorMessage = artError;
      result.status = "error";
    }
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Supabase bağlantı hatası";
    console.error("[getHomePageData]", err);
    return emptyError(
      message.includes("eksik")
        ? message
        : "Supabase bağlantısı kurulamadı. .env.local dosyasını ve proje durumunu kontrol edin.",
    );
  }
}
