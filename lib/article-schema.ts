import type { ArticleDetail } from "@/lib/types/article";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

const PUBLISHER_LOGO_URL = `${SITE_URL}/logo.svg`;

export function buildNewsArticleJsonLd(article: ArticleDetail) {
  const pageUrl = absoluteUrl(`/haber/${article.slug}`);
  const imageUrl = article.imageSrc;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": pageUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    headline: article.title,
    description: article.metaDescription || article.dek,
    keywords: article.seoKeywords.length > 0 ? article.seoKeywords.join(", ") : undefined,
    image: [imageUrl],
    datePublished: article.publishedAt,
    dateModified: article.modifiedAt,
    author: {
      "@type": "Organization",
      name: article.authorName,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: PUBLISHER_LOGO_URL,
        width: 600,
        height: 60,
      },
    },
    articleSection: article.category,
    inLanguage: "tr-TR",
    isAccessibleForFree: true,
  };
}

export function buildBreadcrumbJsonLd(article: ArticleDetail) {
  const categoryUrl = absoluteUrl(`/kategori/${article.categorySlug}`);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Anasayfa",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: article.category,
        item: categoryUrl,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: absoluteUrl(`/haber/${article.slug}`),
      },
    ],
  };
}
