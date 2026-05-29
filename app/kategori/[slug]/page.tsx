import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProvincePicker } from "@/components/category/ProvincePicker";
import { NewsCard } from "@/components/home/NewsCard";
import {
  decodeCategorySlugParam,
  isYerelHubSlug,
} from "@/lib/categories/slug-resolve";
import { TURKIYE_ILLER } from "@/lib/data/turkiye-iller";
import { getCategoryPageData } from "@/lib/queries/category";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type PageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getCategoryPageData(params.slug);
  if (!data) {
    return { title: "Kategori bulunamadı" };
  }

  const url = absoluteUrl(`/kategori/${data.category.slug}`);
  const description =
    data.children.length > 0
      ? `${data.category.name} — Türkiye 81 il yerel haberleri`
      : `${data.category.name} kategorisindeki son haberler — TRNETHABER`;

  return {
    title: data.category.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url,
      title: data.category.name,
      description,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const requestedSlug = decodeCategorySlugParam(params.slug);
  const data = await getCategoryPageData(params.slug);

  if (!data) {
    notFound();
  }

  if (requestedSlug !== data.category.slug) {
    redirect(`/kategori/${data.category.slug}`);
  }

  const { category, parent, children, cards } = data;
  const isYerelHub = isYerelHubSlug(category.slug);
  const provinceOptions = TURKIYE_ILLER;

  return (
    <main className="bg-trnet-surface pb-16">
      <div className="border-b border-black/[0.06] bg-trnet-card">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <nav className="text-sm text-trnet-text/50" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-trnet-primary">
              Anasayfa
            </Link>
            {parent ? (
              <>
                <span className="mx-2">/</span>
                <Link href={`/kategori/${parent.slug}`} className="hover:text-trnet-primary">
                  {parent.name}
                </Link>
              </>
            ) : null}
            <span className="mx-2">/</span>
            <span className="text-trnet-text">{category.name}</span>
          </nav>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-trnet-text sm:text-4xl">
            {category.name}
          </h1>
          <p className="mt-2 text-sm text-trnet-text/55">
            {isYerelHub
              ? "81 ilin yerel haber akışı — açılır pencereden il seçin."
              : cards.length > 0
                ? `${cards.length} haber listeleniyor`
                : "Bu kategoride henüz yayınlanmış haber yok."}
          </p>
          {isYerelHub || isYerelHubSlug(parent?.slug) ? (
            <div className="mt-6">
              <ProvincePicker
                provinces={provinceOptions}
                triggerLabel={isYerelHub ? "Yerel Haberler" : "Diğer iller"}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        {cards.length > 0 ? (
          <>
            {isYerelHub ? (
              <h2 className="mb-4 font-display text-xl font-semibold text-trnet-text">
                Son haberler
              </h2>
            ) : null}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <NewsCard key={card.id} card={card} />
              ))}
            </div>
          </>
        ) : !isYerelHub ? (
          <p className="text-center text-sm text-trnet-text/60">
            Yeni içerikler bot veya admin panelinden eklendiğinde burada görünecek.
          </p>
        ) : null}

        <Link
          href={parent ? `/kategori/${parent.slug}` : "/"}
          className="mt-10 inline-flex text-sm font-semibold text-trnet-primary hover:underline"
        >
          {parent ? `← ${parent.name}` : "← Anasayfaya dön"}
        </Link>
      </div>
    </main>
  );
}
