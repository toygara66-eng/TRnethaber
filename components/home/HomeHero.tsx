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
  "relative h-full w-full min-h-[240px] overflow-hidden aspect-[4/3] max-h-[420px] sm:aspect-[16/10] sm:max-h-[360px] md:aspect-auto md:max-h-none md:min-h-[220px]";

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
          <div className="absolute inset-0 z-10 flex flex-col justify-end px-5 pb-8 sm:px-6 sm:pb-10">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white/15" />
            <div className="mt-3 h-7 max-w-md animate-pulse rounded-lg bg-white/20 md:h-9" />
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
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 via-65% to-transparent"
              aria-hidden
            />
            <div
              className="absolute inset-x-0 bottom-0 top-[28%] bg-gradient-to-t from-black from-0% via-black via-[28%] via-black/95 via-[55%] to-transparent"
              aria-hidden
            />
            <div
              className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black via-black/95 to-black/40 sm:h-[46%]"
              aria-hidden
            />
            <div
              className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black to-black/90 sm:h-40"
              aria-hidden
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 z-10 flex flex-col justify-end px-4 pb-6 pt-10 sm:px-5 sm:pb-7 md:px-6 md:pb-8">
          <div className="mb-6 max-w-3xl sm:mb-7 md:mb-8">
            <p className="mb-3 inline-flex items-center rounded-full border border-white/30 bg-black/75 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white drop-shadow-lg sm:text-[11px]">
              {slide.category}
            </p>
          <p className="text-balance text-xl font-extrabold leading-tight tracking-tight text-white drop-shadow-2xl md:text-2xl lg:text-3xl">
            <Link
              href={haberArticleHref(slide.slug)}
              className="hover:text-white/95"
            >
              {slide.title || "Haber"}
            </Link>
          </p>
          </div>

          {slides.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2.5">
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
