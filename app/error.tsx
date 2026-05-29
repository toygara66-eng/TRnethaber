"use client";

import { useEffect } from "react";
import Link from "next/link";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-trnet-surface px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-trnet-breaking">
        Bir hata oluştu
      </p>
      <h1 className="mt-4 max-w-xl font-display text-3xl font-semibold text-trnet-text sm:text-4xl">
        Sayfa yüklenemedi
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-trnet-text/70">
        Geçici bir sorun olabilir. Sayfayı yenilemeyi deneyin veya ana sayfaya dönün.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[10px] text-trnet-text/40">Kod: {error.digest}</p>
      ) : null}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex rounded-full bg-trnet-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-trnet-breaking"
        >
          Tekrar dene
        </button>
        <Link
          href="/"
          className="inline-flex rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-trnet-text transition hover:border-trnet-primary/40"
        >
          Ana sayfa
        </Link>
      </div>
    </main>
  );
}
