import Link from "next/link";
import { getAllCategorySlugs, getCategoryPageData } from "@/lib/queries/category";

export default async function CategoryNotFound() {
  const slugs = await getAllCategorySlugs();
  const categories = await Promise.all(
    slugs.map(async (slug) => {
      const data = await getCategoryPageData(slug);
      return data ? { slug, name: data.category.name } : null;
    }),
  );
  const links = categories.filter(Boolean) as { slug: string; name: string }[];

  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center bg-trnet-surface px-4 text-center">
      <h1 className="font-display text-3xl font-semibold text-trnet-text sm:text-4xl">
        Kategori bulunamadı
      </h1>
      <p className="mt-3 max-w-md text-trnet-text/70">
        Aradığınız kategori mevcut değil veya adres hatalı olabilir.
      </p>
      {links.length > 0 ? (
        <ul className="mt-6 max-w-lg space-y-2 text-left text-sm">
          <li className="font-semibold text-trnet-text/50">Mevcut kategoriler:</li>
          {links.map((item) => (
            <li key={item.slug}>
              <Link href={`/kategori/${item.slug}`} className="text-trnet-primary hover:underline">
                {item.name}
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
