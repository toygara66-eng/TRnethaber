import { ProvincePicker, type ProvinceOption } from "@/components/category/ProvincePicker";

type Props = {
  provinces: ProvinceOption[];
  parentLabel?: string;
};

/** Yerel Haberler hub — 81 il açılır pencerede */
export function ProvinceGrid({ provinces, parentLabel = "Yerel Haberler" }: Props) {
  if (provinces.length === 0) return null;

  return (
    <section className="mb-10" aria-labelledby="iller-heading">
      <h2
        id="iller-heading"
        className="mb-3 font-display text-xl font-semibold text-trnet-text sm:text-2xl"
      >
        {parentLabel}
      </h2>
      <p className="mb-4 max-w-xl text-sm text-trnet-text/55">
        Türkiye genelinde 81 ilin yerel haber akışına tek tıkla ulaşın.
      </p>
      <ProvincePicker provinces={provinces} triggerLabel="Yerel Haberler" variant="light" />
    </section>
  );
}
