import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntityContent } from "@/components/entity/EntityContent";
import { EntityCoverHero } from "@/components/entity/EntityCoverHero";
import { EntityRelatedNews } from "@/components/entity/EntityRelatedNews";
import { getEntityBySlug, getRelatedArticlesForEntity } from "@/lib/queries/entity";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type PageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const entity = await getEntityBySlug(params.slug);
  if (!entity) {
    return { title: "Varlık bulunamadı" };
  }

  const url = absoluteUrl(`/kimdir/${entity.slug}`);
  const description =
    entity.spotlightReason ??
    (entity.bioContent.slice(0, 160) ||
      `${entity.name} — TRNETHABER semantik varlık profili`);

  return {
    title: entity.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      locale: "tr_TR",
      url,
      title: entity.name,
      description,
      images: entity.imageSrc
        ? [{ url: entity.imageSrc, width: 1920, height: 1080, alt: entity.imageAlt }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: entity.name,
      description,
      images: entity.imageSrc ? [entity.imageSrc] : undefined,
    },
  };
}

export default async function EntityPage({ params }: PageProps) {
  const entity = await getEntityBySlug(params.slug);

  if (!entity) {
    notFound();
  }

  const relatedArticles = await getRelatedArticlesForEntity(entity.slug);

  return (
    <article className="bg-trnet-surface">
      <EntityCoverHero entity={entity} />
      <EntityContent entity={entity} />
      <EntityRelatedNews entityName={entity.name} articles={relatedArticles} />
    </article>
  );
}
