import { redirect } from "next/navigation";
import { decodeCategorySlugParam } from "@/lib/categories/slug-resolve";
import { findIlBySlug } from "@/lib/user-city";

type PageProps = {
  params: { slug: string };
};

/** `/yerel/yozgat` → `/kategori/yerel-yozgat` (veya eşdeğer kategori slug) */
export default function YerelCityRedirectPage({ params }: PageProps) {
  const decoded = decodeCategorySlugParam(params.slug);
  const il = findIlBySlug(decoded);
  const targetSlug = il?.slug ?? decoded;
  redirect(`/kategori/${targetSlug}`);
}
