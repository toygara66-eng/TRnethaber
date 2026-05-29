import { useMemo } from "react";
import { prepareArticleHtml } from "@/lib/articles/sanitize-dom";

type Props = {
  html: string;
};

export function ArticleHtmlBody({ html }: Props) {
  const safe = useMemo(() => prepareArticleHtml(html ?? ""), [html]);

  if (!safe) return null;

  return (
    <div
      className="article-prose article-prose-html mx-auto max-w-3xl px-4 pb-12 pt-0 sm:px-6 md:max-w-4xl sm:pb-14"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
