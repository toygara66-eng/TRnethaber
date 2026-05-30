"use client";

import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { haberArticleHref } from "@/lib/articles/list-card";
import type { HomeHeroSlide } from "@/lib/types/home";
import { EDITORIAL_IMAGE_CLASS } from "@/lib/images/editorial-image";

/** Mobilde yatay oran; masaüstünde sütun yüksekliğini doldurur */
const HERO_FRAME =
  "relative h-full w-full min-h-[220px] overflow-hidden aspect-[21/9] max-h-[280px] sm:max-h-[300px] md:aspect-auto md:max-h-none";

type Props = {
  slides: HomeHeroSlide[];
  status?: "ok" | "loading" | "empty" | "error";
  errorMessage?: string;
};

export function HomeHero({ slides, status = "ok", errorMessage }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) {
    if (status === "loading") {
      return (
        <section
          className={`${HERO_FRAME} overflow-hidden bg-trnet-black`}
          aria-label="Manşet yükleniyor"
          aria-busy="true"
        >
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-neutral-800 via-neutral-900 to-black" />
          <div className="absolute inset-0 z-10 flex flex-col justify-end px-5 pb-5 sm:px-6">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white/15" />
            <div className="mt-3 h-7 max-w-md animate-pulse rounded-lg bg-white/20 sm:h-8" />
            <div className="mt-2 h-7 max-w-sm animate-pulse rounded-lg bg-white/10 sm:h-8" />
          </div>
          <span className="sr-only">Manşet haberleri yükleniyor</span>
        </section>
      );
    }

    const hint =
      errorMessage ??
      (status === "empty"
        ? "Henüz yayınlanmış haber yok. Supabase SQL Editor'de supabase/seed.sql dosyasını çalıştırın."
        : "Manşet haberleri yüklenemedi. .env.local ve Supabase proje durumunu kontrol edin.");

    return (
      <section
        className={`${HERO_FRAME} overflow-hidden bg-trnet-black`}
        aria-label="Manşet alanı"
      >
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="font-display text-lg text-white/90">
            {status === "error" ? "Manşet yüklenemedi" : "Manşet bekleniyor"}
          </p>
          <p className="max-w-md text-sm leading-relaxed text-white/55">{hint}</p>
        </div>
      </section>
    );
  }

  const slide = slides[index] ?? slides[0];

  return (
    <section
      className={`${HERO_FRAME} overflow-hidden bg-black`}
      aria-labelledby="home-hero-heading"
    >
      <h2 id="home-hero-heading" className="sr-only">
        Manşet haberleri
      </h2>
      <div className="absolute inset-0">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <SafeImage
              src={slide.imageSrc}
              alt={slide.imageAlt}
              fill
              priority={index === 0}
              placeholderVariant="dark"
              sizes="(min-width: 720px) 720px, 100vw"
              className={EDITORIAL_IMAGE_CLASS}
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/30 to-transparent"
              aria-hidden
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 z-10 flex flex-col justify-end px-4 pb-3 pt-8 sm:px-5 sm:pb-4 md:px-6">
          <div className="max-w-xl">
            <p className="mb-1 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/90">
              {slide.category}
            </p>
            <h2 className="font-display text-balance text-lg font-semibold leading-snug tracking-tight text-white sm:text-xl md:text-2xl">
              <Link
                href={haberArticleHref(slide.slug)}
                className="hover:text-white/90"
              >
                {slide.title || "Haber"}
              </Link>
            </h2>
            {slide.dek?.trim() ? (
              <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-white/75 sm:text-[0.9375rem]">
                {slide.dek.trim()}
              </p>
            ) : null}
          </div>

          {slides.length > 1 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition hover:border-white hover:bg-white/10"
                  aria-label="Önceki manşet"
                  onClick={() =>
                    setIndex((i) => (i - 1 + slides.length) % slides.length)
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition hover:border-white hover:bg-white/10"
                  aria-label="Sonraki manşet"
                  onClick={() => setIndex((i) => (i + 1) % slides.length)}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-1.5">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Manşet ${i + 1}`}
                    aria-current={i === index}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? "w-8 bg-trnet-primary" : "w-2.5 bg-white/35 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
