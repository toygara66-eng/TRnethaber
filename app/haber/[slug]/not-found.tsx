import Link from "next/link";
import { getAllArticleSlugs, getArticleBySlug } from "@/lib/queries/article";

export default async function ArticleNotFound() {
  const slugs = await getAllArticleSlugs();
  const recent = await Promise.all(
    slugs.slice(0, 5).map(async (slug) => {
      const article = await getArticleBySlug(slug);
      return article ? { slug, title: article.title } : null;
    }),
  );
  const links = recent.filter(Boolean) as { slug: string; title: string }[];

  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center bg-trnet-surface px-4 text-center">
      <h1 className="font-display text-3xl font-semibold text-trnet-text sm:text-4xl">
        Haber bulunamadı
      </h1>
      <p className="mt-3 max-w-md text-trnet-text/70">
        Aradığınız içerik kaldırılmış veya adres hatalı olabilir.
      </p>
      {links.length > 0 ? (
        <ul className="mt-6 max-w-lg space-y-2 text-left text-sm">
          <li className="font-semibold text-trnet-text/50">Son haberler:</li>
          {links.map((item) => (
            <li key={item.slug}>
              <Link href={`/haber/${item.slug}`} className="text-trnet-primary hover:underline">
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href="/"
        className="mt-8 inline-flex rounded-full bg-trnet-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-trnet-breaking"
      >
        Anasayfaya dön
      </Link>
    </main>
  );
}
