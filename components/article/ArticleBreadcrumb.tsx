import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ArticleDetail } from "@/lib/types/article";

type Props = {
  article: ArticleDetail;
  variant?: "light" | "dark";
};

export function ArticleBreadcrumb({ article, variant = "dark" }: Props) {
  const muted = variant === "dark" ? "text-white/55" : "text-trnet-text/50";
  const link = variant === "dark" ? "text-white/80 hover:text-white" : "text-trnet-text/70 hover:text-trnet-text";
  const current = variant === "dark" ? "text-white" : "text-trnet-text";
  const category = article.category?.trim();
  const categorySlug = article.categorySlug?.trim();
  const title = article.title?.trim() || "Haber";

  return (
    <nav aria-label="Sayfa konumu" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-xs font-medium sm:text-sm">
        <li>
          <Link href="/" className={link}>
            Anasayfa
          </Link>
        </li>
        {category && categorySlug ? (
          <>
            <li className={muted} aria-hidden>
              <ChevronRight className="inline h-3.5 w-3.5" />
            </li>
            <li>
              <Link href={`/kategori/${categorySlug}`} className={link}>
                {category}
              </Link>
            </li>
          </>
        ) : null}
        <li className={muted} aria-hidden>
          <ChevronRight className="inline h-3.5 w-3.5" />
        </li>
        <li className={`line-clamp-1 max-w-[14rem] sm:max-w-xs ${current}`} aria-current="page">
          {title}
        </li>
      </ol>
    </nav>
  );
}
