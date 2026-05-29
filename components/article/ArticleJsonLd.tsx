import type { ArticleDetail } from "@/lib/types/article";
import {
  buildBreadcrumbJsonLd,
  buildNewsArticleJsonLd,
} from "@/lib/article-schema";

type Props = {
  article: ArticleDetail;
  publisherLogoUrl?: string;
};

export function ArticleJsonLd({ article, publisherLogoUrl }: Props) {
  const newsArticle = buildNewsArticleJsonLd(article, publisherLogoUrl);
  const breadcrumb = buildBreadcrumbJsonLd(article);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticle) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  );
}
