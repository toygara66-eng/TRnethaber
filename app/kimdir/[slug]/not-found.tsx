import Link from "next/link";

export default function EntityNotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-semibold text-trnet-text">Varlık bulunamadı</h1>
      <p className="mt-3 text-trnet-text/60">
        Aradığınız kişi, kurum veya takım profili sistemde kayıtlı değil.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-trnet-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Anasayfaya dön
      </Link>
    </main>
  );
}
