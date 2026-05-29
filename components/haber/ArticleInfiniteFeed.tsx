"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArticleJsonLd } from "@/components/article/ArticleJsonLd";
import { ArticleBody } from "@/components/article/ArticleBody";
import { ArticleCoverHero } from "@/components/article/ArticleCoverHero";
import { ArticleCommentsSection } from "@/components/comments/ArticleCommentsSection";
import { ArticleViewTracker } from "@/components/haber/ArticleViewTracker";
import Sidebar from "@/components/Sidebar";
import type { ArticleDetail } from "@/lib/types/article";

type Props = {
  initialArticle: ArticleDetail;
  publisherLogoUrl?: string;
};

export function ArticleInfiniteFeed({ initialArticle, publisherLogoUrl }: Props) {
  const [articles, setArticles] = useState<ArticleDetail[]>([initialArticle]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeSlug, setActiveSlug] = useState(initialArticle.slug);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadLock = useRef(false);
  const articleRefs = useRef<Map<string, HTMLElement>>(new Map());

  const loadNext = useCallback(async () => {
    if (loadLock.current || loading || !hasMore) return;
    const last = articles[articles.length - 1];
    if (!last?.id) return;

    loadLock.current = true;
    setLoading(true);

    try {
      const res = await fetch(
        `/api/articles/next?currentId=${encodeURIComponent(last.id)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setHasMore(false);
        return;
      }

      const data = (await res.json()) as { article: ArticleDetail | null };
      if (!data.article) {
        setHasMore(false);
        return;
      }

      setArticles((prev) => {
        if (prev.some((a) => a.id === data.article!.id)) return prev;
        return [...prev, data.article!];
      });
    } catch (err) {
      console.warn("[ArticleInfiniteFeed] loadNext", err);
      setHasMore(false);
    } finally {
      setLoading(false);
      loadLock.current = false;
    }
  }, [articles, hasMore, loading]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadNext();
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadNext]);

  useEffect(() => {
    const nodes = Array.from(articleRefs.current.entries());
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const top = visible[0];
        if (!top?.target) return;

        const slug = top.target.getAttribute("data-article-slug");
        if (!slug || slug === activeSlug) return;

        const match = articles.find((a) => a.slug === slug);
        if (!match) return;

        setActiveSlug(slug);
        const nextUrl = `/haber/${slug}`;
        if (window.location.pathname !== nextUrl) {
          window.history.pushState({ articleSlug: slug }, "", nextUrl);
        }
        document.title = `${match.title} · TRNETHABER`;
      },
      { threshold: [0.25, 0.45, 0.65], rootMargin: "-12% 0px -55% 0px" },
    );

    for (const [, el] of nodes) observer.observe(el);
    return () => observer.disconnect();
  }, [articles, activeSlug]);

  useEffect(() => {
    const onPop = () => {
      const slug = window.location.pathname.split("/").pop();
      if (slug) setActiveSlug(slug);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1">
          {articles.map((article, index) => (
            <section
              key={article.id}
              ref={(el) => {
                if (el) articleRefs.current.set(article.slug, el);
                else articleRefs.current.delete(article.slug);
              }}
              data-article-slug={article.slug}
              className={index > 0 ? "mt-14 border-t border-black/10 pt-14" : ""}
              aria-label={article.title}
            >
              <ArticleJsonLd article={article} publisherLogoUrl={publisherLogoUrl} />
              <ArticleViewTracker
                articleId={article.id}
                observeVisibility={index > 0}
              />
              <article className="bg-trnet-surface">
                <ArticleCoverHero article={article} />
                <ArticleBody contentHtml={article.contentHtml} blocks={article.blocks} />
                <div className="mx-auto max-w-3xl px-4 pb-10 sm:px-6 md:max-w-4xl">
                  <ArticleCommentsSection articleId={article.id} />
                </div>
              </article>
            </section>
          ))}

          <div ref={sentinelRef} className="h-6 w-full" aria-hidden />

          {loading ? (
            <p className="mt-8 text-center text-sm text-trnet-text/50">
              Sonraki haber yükleniyor…
            </p>
          ) : null}
        </div>

        <div className="w-full shrink-0 lg:sticky lg:top-24 lg:w-80 xl:w-96">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
