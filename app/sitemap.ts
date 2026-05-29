import type { MetadataRoute } from "next";
import { fetchPublishedArticlesForSitemap } from "@/lib/seo/sitemap-articles";
import { getSiteBaseUrl } from "@/lib/site-url";

/** Sitemap önbelleği — DB yükünü azaltır, Google için saatlik güncelleme yeterli */
export const revalidate = 3600;

function toLastModified(publishedAt: string): Date {
  const parsed = new Date(publishedAt);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function buildCoreEntries(baseUrl: string): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/sana-ozel`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}

function buildArticleEntries(
  baseUrl: string,
  articles: Awaited<ReturnType<typeof fetchPublishedArticlesForSitemap>>,
): MetadataRoute.Sitemap {
  return articles.map((row) => ({
    url: `${baseUrl}/haber/${row.slug}`,
    lastModified: toLastModified(row.published_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl();
  const coreEntries = buildCoreEntries(baseUrl);

  try {
    const articles = await fetchPublishedArticlesForSitemap();
    return [...coreEntries, ...buildArticleEntries(baseUrl, articles)];
  } catch (err) {
    console.warn("[sitemap] Haberler yüklenemedi, çekirdek URL'ler döndürülüyor:", err);
    return coreEntries;
  }
}
