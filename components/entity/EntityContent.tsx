import { Sparkles } from "lucide-react";
import type { EntityDetail } from "@/lib/types/entity";

type Props = {
  entity: EntityDetail;
};

export function EntityContent({ entity }: Props) {
  const paragraphs = entity.bioContent
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-14 lg:py-16">
      {entity.spotlightReason ? (
        <aside className="mb-10 rounded-2xl border border-trnet-primary/20 bg-trnet-primary/[0.06] p-6 shadow-sm ring-1 ring-trnet-primary/10">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-trnet-primary">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            Neden gündemde?
          </div>
          <p className="text-lg leading-relaxed text-trnet-text">{entity.spotlightReason}</p>
        </aside>
      ) : null}

      <section aria-labelledby="entity-bio-heading">
        <h2
          id="entity-bio-heading"
          className="mb-6 font-display text-2xl font-semibold text-trnet-text sm:text-3xl"
        >
          Biyografi
        </h2>
        {paragraphs.length > 0 ? (
          paragraphs.map((text, index) => (
            <p
              key={`bio-${index}`}
              className="mb-6 text-lg leading-relaxed text-trnet-text last:mb-0"
            >
              {text}
            </p>
          ))
        ) : (
          <p className="text-lg leading-relaxed text-trnet-text/60">
            Bu varlık için biyografi metni henüz eklenmedi.
          </p>
        )}
      </section>
    </div>
  );
}
