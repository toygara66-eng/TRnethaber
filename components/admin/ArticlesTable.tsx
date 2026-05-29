import Link from "next/link";
import { ExternalLink, Zap } from "lucide-react";
import { ArticleSocialShareIcons } from "@/components/admin/ArticleSocialShareIcons";
import type { AdminArticleRow } from "@/lib/queries/admin";

type Props = {
  articles: AdminArticleRow[];
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ArticlesTable({ articles }: Props) {
  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-trnet-card p-12 text-center shadow-sm">
        <p className="text-trnet-text/60">Henüz haber kaydı yok.</p>
        <Link
          href="/admin/haber-ekle"
          className="mt-4 inline-flex rounded-full bg-trnet-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-trnet-breaking"
        >
          İlk haberi ekle
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] bg-trnet-surface/80">
              <th className="px-5 py-4 font-semibold text-trnet-text">Başlık</th>
              <th className="px-5 py-4 font-semibold text-trnet-text">Kategori</th>
              <th className="px-5 py-4 font-semibold text-trnet-text">Okunma</th>
              <th className="px-5 py-4 font-semibold text-trnet-text">Durum</th>
              <th className="px-5 py-4 font-semibold text-trnet-text">Yayın</th>
              <th className="px-4 py-4 font-semibold text-trnet-text">Sosyal</th>
              <th className="px-5 py-4 font-semibold text-trnet-text">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {articles.map((article) => (
              <tr key={article.id} className="transition hover:bg-trnet-surface/50">
                <td className="max-w-xs px-5 py-4">
                  <p className="font-medium text-trnet-text line-clamp-2">{article.title}</p>
                  <p className="mt-0.5 font-mono text-xs text-trnet-text/45">{article.slug}</p>
                </td>
                <td className="px-5 py-4 text-trnet-text/80">{article.category_name}</td>
                <td className="px-5 py-4 whitespace-nowrap font-mono tabular-nums text-trnet-text/80">
                  {article.view_count.toLocaleString("tr-TR")}
                </td>
                <td className="px-5 py-4">
                  {article.is_breaking ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-trnet-breaking/10 px-2.5 py-1 text-xs font-semibold text-trnet-breaking">
                      <Zap className="h-3 w-3" aria-hidden />
                      Son dakika
                    </span>
                  ) : (
                    <span className="text-trnet-text/40">—</span>
                  )}
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-trnet-text/60">
                  {formatDate(article.published_at ?? article.created_at)}
                </td>
                <td className="px-4 py-4">
                  <ArticleSocialShareIcons socialShared={article.social_shared} />
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/haber/${article.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-sm font-medium text-trnet-primary hover:underline"
                  >
                    Görüntüle
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
