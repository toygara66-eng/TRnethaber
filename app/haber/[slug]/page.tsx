import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleInfiniteFeed } from "@/components/haber/ArticleInfiniteFeed";
import { resolveCoverImageSrc, resolveSiteLogoUrl } from "@/lib/images/cover";
import { getArticleBySlug } from "@/lib/queries/article";
import { getSiteSettings } from "@/lib/queries/site-settings";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type PageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    return { title: "Haber bulunamadı" };
  }

  const url = absoluteUrl(`/haber/${article.slug}`);
  const description = article.metaDescription || article.dek || article.title;
  const keywords = article.seoKeywords?.length ? article.seoKeywords : undefined;
  const ogImage = resolveCoverImageSrc(article.imageSrc);

  return {
    title: article.title || "Haber",
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "tr_TR",
      url,
      title: article.title || "Haber",
      description,
      publishedTime: article.publishedAt,
      modifiedTime: article.modifiedAt,
      section: article.category || undefined,
      images: [
        {
          url: ogImage.startsWith("/") ? absoluteUrl(ogImage) : ogImage,
          width: 1920,
          height: 1080,
          alt: article.imageAlt || article.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title || "Haber",
      description,
      images: [ogImage.startsWith("/") ? absoluteUrl(ogImage) : ogImage],
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = params;

  let article = null;
  let publisherLogoUrl = resolveSiteLogoUrl(null, "/logo.svg");

  try {
    const [fetchedArticle, settings] = await Promise.all([
      getArticleBySlug(slug),
      getSiteSettings(),
    ]);
    article = fetchedArticle;
    publisherLogoUrl = resolveSiteLogoUrl(settings?.logoRectangleUrl, "/logo.svg");
  } catch (err) {
    console.error("[ArticlePage]", err);
    article = await getArticleBySlug(slug).catch(() => null);
  }

  if (!article) {
    notFound();
  }

  return (
    <div className="bg-trnet-surface pb-16 pt-0">
      <ArticleInfiniteFeed
        initialArticle={article}
        publisherLogoUrl={publisherLogoUrl}
      />
    </div>
  );
}
