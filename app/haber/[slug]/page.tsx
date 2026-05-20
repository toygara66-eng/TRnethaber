import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleJsonLd } from "@/components/article/ArticleJsonLd";
import { ArticleCoverHero } from "@/components/article/ArticleCoverHero";
import { ArticleBody } from "@/components/article/ArticleBody";
import { getArticleBySlug } from "@/lib/queries/article";
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
  const description = article.metaDescription || article.dek;
  const keywords = article.seoKeywords;

  return {
    title: article.title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "tr_TR",
      url,
      title: article.title,
      description,
      publishedTime: article.publishedAt,
      modifiedTime: article.modifiedAt,
      section: article.category,
      images: article.imageSrc
        ? [
            {
              url: article.imageSrc,
              width: 1920,
              height: 1080,
              alt: article.imageAlt,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: article.imageSrc ? [article.imageSrc] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <>
      <ArticleJsonLd article={article} />
      <article className="bg-trnet-surface">
        <ArticleCoverHero article={article} />
        <ArticleBody blocks={article.blocks} />
      </article>
    </>
  );
}
