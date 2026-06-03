import { Clock } from "lucide-react";
import type { ArticleDetail } from "@/lib/types/article";
import { ArticleBreadcrumb } from "@/components/article/ArticleBreadcrumb";
import { ArticleSocialShare } from "@/components/article/ArticleSocialShare";
import { SafeImage } from "@/components/ui/SafeImage";
import { EDITORIAL_IMAGE_CLASS } from "@/lib/images/editorial-image";

type Props = {
  article: ArticleDetail;
};

function formatPublished(iso: string): string | null {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(parsed));
}

function AuthorByline({ authorName }: { authorName: string }) {
  const parts = authorName.split(/\s\/\s+/);
  if (parts.length >= 2) {
    return (
      <li className="font-medium text-trnet-text/70">
        <span className="font-semibold text-trnet-text">{parts[0]}</span>
        <span className="text-trnet-text/45"> / </span>
        <span className="text-trnet-primary">{parts.slice(1).join(" / ")}</span>
      </li>
    );
  }
  return <li className="font-medium text-trnet-text/70">{authorName}</li>;
}

export function ArticleCoverHero({ article }: Props) {
  const publishedLabel = formatPublished(article.publishedAt);
  const readTime = article.readTimeLabel?.trim();
  const author = article.authorName?.trim();
  const category = article.category?.trim();
  const spotHtml = article.spotHtml?.trim() || article.dek?.trim();

  return (
    <header className="mx-auto w-full max-w-3xl px-4 pt-8 sm:px-6 sm:pt-10 md:max-w-4xl lg:pt-12">
      <ArticleBreadcrumb article={article} variant="light" />

      {category ? (
        <p className="mt-4 inline-flex w-fit items-center rounded-full border border-black/[0.08] bg-trnet-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-trnet-primary">
          {category}
        </p>
      ) : null}

      <h1 className="mb-4 mt-4 font-display text-balance text-4xl font-bold leading-[1.2] tracking-tight text-trnet-text sm:text-5xl sm:leading-[1.15]">
        {article.title || "Haber"}
      </h1>

      {spotHtml ? (
        <div
          className="article-spot-html mb-8 line-clamp-4 border-l-4 border-trnet-primary pl-4 text-xl font-normal leading-loose sm:text-[1.25rem]"
          dangerouslySetInnerHTML={{ __html: spotHtml }}
        />
      ) : null}

      <ul className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-black/[0.06] pb-6 text-sm text-trnet-text/55 sm:mb-8">
        {readTime ? (
          <li className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-trnet-primary" aria-hidden />
            <span>{readTime}</span>
          </li>
        ) : null}
        {publishedLabel ? (
          <li>
            <time dateTime={article.publishedAt}>{publishedLabel}</time>
          </li>
        ) : null}
        {author ? <AuthorByline authorName={author} /> : null}
      </ul>

      <ArticleSocialShare title={article.title || "Haber"} slug={article.slug} />

      <figure
        className={`relative mb-8 aspect-video overflow-hidden rounded-xl bg-neutral-900 sm:mb-10 ${EDITORIAL_IMAGE_CLASS}`}
      >
        <SafeImage
          src={article.imageSrc}
          alt={article.imageAlt}
          fill
          priority
          sizes="(min-width: 720px) 720px, 100vw"
          className={EDITORIAL_IMAGE_CLASS}
        />
      </figure>
    </header>
  );
}
