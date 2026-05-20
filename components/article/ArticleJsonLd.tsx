import type { ArticleDetail } from "@/lib/types/article";
import {
  buildBreadcrumbJsonLd,
  buildNewsArticleJsonLd,
} from "@/lib/article-schema";

type Props = {
  article: ArticleDetail;
};

export function ArticleJsonLd({ article }: Props) {
  const newsArticle = buildNewsArticleJsonLd(article);
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
