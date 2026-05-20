import Link from "next/link";
import type { CategorySection } from "@/lib/types/home";
import { NewsCard } from "@/components/home/NewsCard";

type Props = {
  sections: CategorySection[];
  status?: "ok" | "empty" | "error";
  errorMessage?: string;
};

export function CategoryGrid({ sections, status = "ok", errorMessage }: Props) {
  const withCards = sections.filter((s) => s.cards.length > 0);

  if (withCards.length === 0) {
    const hint =
      errorMessage ??
      (status === "error"
        ? "Supabase bağlantısı kurulamadı."
        : "Henüz yayınlanmış haber bulunmuyor. npm run db:check ile bağlantıyı doğrulayın; gerekirse supabase/seed.sql çalıştırın.");

    return (
      <p className="mt-12 text-center text-sm leading-relaxed text-trnet-text/60">{hint}</p>
    );
  }

  return (
    <div className="mt-12 space-y-14 sm:mt-16 sm:space-y-16">
      {withCards.map((section) => (
        <section key={section.slug} aria-labelledby={`heading-${section.slug}`}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2
              id={`heading-${section.slug}`}
              className="font-display text-2xl font-semibold tracking-tight text-trnet-text sm:text-3xl"
            >
              <Link href={`/kategori/${section.slug}`} className="hover:text-trnet-primary">
                {section.label}
              </Link>
            </h2>
            <Link
              href={`/kategori/${section.slug}`}
              className="hidden text-sm font-medium text-trnet-primary hover:underline sm:inline"
            >
              Tümünü gör
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {section.cards.map((card) => (
              <NewsCard
                key={card.id}
                card={card}
                href={`/haber/${card.slug}`}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
