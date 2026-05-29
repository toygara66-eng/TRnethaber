import { NotFoundView } from "@/components/seo/NotFoundView";

export default function EntityNotFound() {
  return (
    <NotFoundView
      title="Varlık bulunamadı"
      description="Aradığınız kişi, kurum veya takım profili sistemde kayıtlı değil."
    />
  );
}
