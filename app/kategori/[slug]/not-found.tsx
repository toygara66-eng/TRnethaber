import Link from "next/link";
import { NotFoundView } from "@/components/seo/NotFoundView";
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
    <NotFoundView
      title="Kategori bulunamadı"
      description="Aradığınız kategori mevcut değil veya adres hatalı olabilir."
    >
      {links.length > 0 ? (
        <ul className="mt-8 max-w-lg space-y-2 text-left text-sm">
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
    </NotFoundView>
  );
}
