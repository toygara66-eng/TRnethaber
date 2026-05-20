import type { EntityDetail } from "@/lib/types/entity";
import { EntityBreadcrumb } from "@/components/entity/EntityBreadcrumb";
import { SafeImage } from "@/components/ui/SafeImage";

type Props = {
  entity: EntityDetail;
};

export function EntityCoverHero({ entity }: Props) {
  return (
    <header className="relative w-full min-h-[min(68vh,640px)] bg-trnet-black">
      <div className="absolute inset-0">
        <SafeImage
          src={entity.imageSrc}
          alt={entity.imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/25"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[min(68vh,640px)] max-w-4xl flex-col justify-end px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:pb-16">
        <EntityBreadcrumb entity={entity} variant="dark" />
        <p className="mb-3 inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur">
          {entity.entityTypeLabel}
        </p>
        <h1 className="font-display text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
          {entity.name}
        </h1>
      </div>
    </header>
  );
}
