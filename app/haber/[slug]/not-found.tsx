import Link from "next/link";
import { NotFoundView } from "@/components/seo/NotFoundView";
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
    <NotFoundView
      title="Haber bulunamadı"
      description="Aradığınız içerik kaldırılmış, yayından çekilmiş veya adres hatalı olabilir."
    >
      {links.length > 0 ? (
        <ul className="mt-8 max-w-lg space-y-2 text-left text-sm">
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
    </NotFoundView>
  );
}
