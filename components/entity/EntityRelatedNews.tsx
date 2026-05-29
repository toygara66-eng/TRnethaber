import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import type { EntityRelatedCard } from "@/lib/types/entity";

type Props = {
  entityName: string;
  articles: EntityRelatedCard[];
};

export function EntityRelatedNews({ entityName, articles }: Props) {
  return (
    <section className="border-t border-black/[0.06] bg-trnet-surface py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h2 className="font-display text-2xl font-semibold text-trnet-text sm:text-3xl">
            İlgili Haberler
          </h2>
          <p className="mt-2 text-sm text-trnet-text/55">
            {entityName} ile ilişkili son başlıklar
          </p>
        </header>

        {articles.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-trnet-text/15 bg-trnet-card px-6 py-12 text-center text-trnet-text/50">
            Bu varlıkla eşleşen haber henüz yok. Slug eşleşmesi eklendikçe liste dolacak.
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/haber/${article.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-trnet-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03] transition-shadow hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)]"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-trnet-surface">
                    <SafeImage
                      src={article.imageSrc}
                      alt={article.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-trnet-primary">
                      <span>{article.category}</span>
                    </div>
                    <h3 className="text-balance font-display text-lg font-semibold leading-snug text-trnet-text group-hover:text-trnet-primary">
                      {article.title}
                    </h3>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
