import type { ArticleDetail } from "@/lib/types/article";

import { resolveCoverImageSrc, resolveSiteLogoUrl } from "@/lib/images/cover";

import { safeIsoDate, safeSlug, safeText } from "@/lib/safe-display";

import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";



export function buildNewsArticleJsonLd(

  article: ArticleDetail,

  publisherLogoUrl?: string | null,

) {

  const pageUrl = absoluteUrl(`/haber/${safeSlug(article.slug)}`);

  const imageUrl = resolveCoverImageSrc(article.imageSrc);

  const logoUrl = resolveSiteLogoUrl(publisherLogoUrl, "/logo.svg");

  const title = safeText(article.title, "Haber");

  const description = safeText(article.metaDescription || article.dek, title);

  const keywords =

    article.seoKeywords?.length > 0 ? article.seoKeywords.join(", ") : undefined;

  const section = safeText(article.category, "Gündem");

  const authorName = safeText(article.authorName, SITE_NAME);



  return {

    "@context": "https://schema.org",

    "@type": "NewsArticle",

    "@id": pageUrl,

    mainEntityOfPage: {

      "@type": "WebPage",

      "@id": pageUrl,

    },

    headline: title,

    description,

    keywords,

    image: [imageUrl],

    datePublished: safeIsoDate(article.publishedAt),

    dateModified: safeIsoDate(article.modifiedAt),

    author: {

      "@type": "Organization",

      name: authorName,

      url: SITE_URL,

    },

    publisher: {

      "@type": "Organization",

      name: SITE_NAME,

      url: SITE_URL,

      logo: {

        "@type": "ImageObject",

        url: logoUrl,

        width: 600,

        height: 60,

      },

    },

    articleSection: section,

    inLanguage: "tr-TR",

    isAccessibleForFree: true,

  };

}



export function buildBreadcrumbJsonLd(article: ArticleDetail) {

  const title = safeText(article.title, "Haber");

  const categoryName = safeText(article.category, "Gündem");

  const categorySlug = safeSlug(article.categorySlug, "gundem");

  const categoryUrl = absoluteUrl(`/kategori/${categorySlug}`);

  const articleUrl = absoluteUrl(`/haber/${safeSlug(article.slug)}`);



  const items: Array<{

    "@type": "ListItem";

    position: number;

    name: string;

    item: string;

  }> = [

    {

      "@type": "ListItem",

      position: 1,

      name: "Anasayfa",

      item: SITE_URL,

    },

  ];



  if (categorySlug && categoryName) {

    items.push({

      "@type": "ListItem",

      position: 2,

      name: categoryName,

      item: categoryUrl,

    });

    items.push({

      "@type": "ListItem",

      position: 3,

      name: title,

      item: articleUrl,

    });

  } else {

    items.push({

      "@type": "ListItem",

      position: 2,

      name: title,

      item: articleUrl,

    });

  }



  return {

    "@context": "https://schema.org",

    "@type": "BreadcrumbList",

    itemListElement: items,

  };

}



export function buildOrganizationJsonLd(logoSquareUrl?: string | null) {

  const logoUrl = resolveSiteLogoUrl(logoSquareUrl, "/logo-square.png");



  return {

    "@context": "https://schema.org",

    "@type": "NewsMediaOrganization",

    name: SITE_NAME,

    url: SITE_URL,

    logo: {

      "@type": "ImageObject",

      url: logoUrl,

      width: 512,

      height: 512,

    },

    sameAs: [SITE_URL],

  };

}



export function buildWebSiteJsonLd() {

  return {

    "@context": "https://schema.org",

    "@type": "WebSite",

    name: SITE_NAME,

    url: SITE_URL,

    inLanguage: "tr-TR",

    publisher: {

      "@type": "Organization",

      name: SITE_NAME,

    },

  };

}


