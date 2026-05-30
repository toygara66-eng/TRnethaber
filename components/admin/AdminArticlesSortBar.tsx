import Link from "next/link";
import type { AdminArticlesSort } from "@/lib/queries/admin";

type Props = {
  current: AdminArticlesSort;
};

export function AdminArticlesSortBar({ current }: Props) {
  const base =
    "rounded-full px-3 py-1.5 text-xs font-semibold transition border";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Sıralama">
      <span className="text-xs font-medium text-trnet-text/50">Sırala:</span>
      <Link
        href="/admin/articles"
        className={`${base} ${
          current === "newest"
            ? "border-trnet-primary bg-trnet-primary/10 text-trnet-primary"
            : "border-black/10 text-trnet-text/70 hover:border-trnet-primary/30"
        }`}
      >
        Tarihe göre
      </Link>
      <Link
        href="/admin/articles?sort=most_read"
        className={`${base} ${
          current === "most_read"
            ? "border-trnet-primary bg-trnet-primary/10 text-trnet-primary"
            : "border-black/10 text-trnet-text/70 hover:border-trnet-primary/30"
        }`}
      >
        Okunma sayısına göre
      </Link>
    </div>
  );
}
