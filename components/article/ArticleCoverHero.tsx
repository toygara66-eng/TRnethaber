import { Clock, Eye } from "lucide-react";
import type { ArticleDetail } from "@/lib/types/article";
import { ArticleBreadcrumb } from "@/components/article/ArticleBreadcrumb";
import { SafeImage } from "@/components/ui/SafeImage";

type Props = {
  article: ArticleDetail;
};

function formatPublished(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(iso));
}

export function ArticleCoverHero({ article }: Props) {
  return (
    <header className="relative w-full min-h-[min(72vh,720px)] bg-trnet-black">
      <div className="absolute inset-0">
        <SafeImage
          src={article.imageSrc}
          alt={article.imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/25"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[min(72vh,720px)] max-w-4xl flex-col justify-end px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:pb-16">
        <ArticleBreadcrumb article={article} variant="dark" />
        <p className="mb-3 inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur">
          {article.category}
        </p>
        <h1 className="font-display text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-[3.35rem]">
          {article.title}
        </h1>
        <p className="mt-4 max-w-2xl text-balance text-base leading-relaxed text-white/80 sm:text-lg">
          {article.dek}
        </p>
        <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
          <li className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-trnet-primary" aria-hidden />
            <span>{article.readTimeLabel}</span>
          </li>
          <li className="inline-flex items-center gap-2">
            <Eye className="h-4 w-4 shrink-0 text-trnet-primary" aria-hidden />
            <span>{article.viewCountLabel}</span>
          </li>
          <li>
            <time dateTime={article.publishedAt}>{formatPublished(article.publishedAt)}</time>
          </li>
          <li className="w-full sm:w-auto">{article.authorName}</li>
        </ul>
      </div>
    </header>
  );
}
