"use client";

import { useEffect } from "react";
import Link from "next/link";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[admin/error]", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <h1 className="font-display text-2xl font-semibold text-trnet-text">Admin paneli hatası</h1>
      <p className="mt-2 max-w-md text-sm text-trnet-text/60">
        Bu bölüm yüklenirken bir sorun oluştu. Tekrar deneyebilir veya listeye dönebilirsiniz.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-trnet-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-trnet-breaking"
        >
          Tekrar dene
        </button>
        <Link
          href="/admin/articles"
          className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold text-trnet-text hover:border-trnet-primary/40"
        >
          Haber listesi
        </Link>
      </div>
    </div>
  );
}
