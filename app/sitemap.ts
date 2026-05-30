import type { MetadataRoute } from "next";
import {
  ALL_NAV_CATEGORY_ITEMS,
  categoryHref,
  GAMES_NAV_ITEM,
} from "@/lib/data/nav-categories";
import { fetchPublishedArticlesForSitemap } from "@/lib/seo/sitemap-articles";
import { getSiteBaseUrl } from "@/lib/site-url";

/** Sitemap önbelleği — DB yükünü azaltır */
export const revalidate = 3600;

function parseDate(iso: string | null | undefined): Date {
  if (!iso?.trim()) return new Date();
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function buildStaticEntries(baseUrl: string): MetadataRoute.Sitemap {
  const now = new Date();
  const root = baseUrl.replace(/\/$/, "");

  const categoryEntries: MetadataRoute.Sitemap = ALL_NAV_CATEGORY_ITEMS.map((item) => ({
    url: `${root}${categoryHref(item.slug)}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.75,
  }));

  return [
    {
      url: root,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...categoryEntries,
    {
      url: `${root}/kategori/yerel-haberler`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${root}${GAMES_NAV_ITEM.href}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];
}

function buildArticleEntries(
  baseUrl: string,
  articles: Awaited<ReturnType<typeof fetchPublishedArticlesForSitemap>>,
): MetadataRoute.Sitemap {
  const root = baseUrl.replace(/\/$/, "");

  return articles.map((row) => ({
    url: `${root}/haber/${row.slug}`,
    lastModified: parseDate(row.updated_at ?? row.published_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl();
  const staticEntries = buildStaticEntries(baseUrl);

  try {
    const articles = await fetchPublishedArticlesForSitemap();
    return [...staticEntries, ...buildArticleEntries(baseUrl, articles)];
  } catch (err) {
    console.warn("[sitemap] Haberler yüklenemedi, statik URL'ler döndürülüyor:", err);
    return staticEntries;
  }
}
