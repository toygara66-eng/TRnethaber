"use client";

import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HomeHeroSlide } from "@/lib/types/home";

const HERO_MIN_H = "min-h-[420px] sm:min-h-[480px] lg:min-h-[560px]";

type Props = {
  slides: HomeHeroSlide[];
  status?: "ok" | "empty" | "error";
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
    const hint =
      errorMessage ??
      (status === "empty"
        ? "Henüz yayınlanmış haber yok. Supabase SQL Editor'de supabase/seed.sql dosyasını çalıştırın."
        : "Manşet haberleri yüklenemedi. .env.local ve Supabase proje durumunu kontrol edin.");

    return (
      <section
        className={`relative w-full overflow-hidden bg-trnet-black ${HERO_MIN_H}`}
        aria-label="Manşet alanı"
      >
        <div className="relative z-10 mx-auto flex min-h-[inherit] max-w-3xl flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="font-display text-xl text-white/90">Manşet yüklenemedi</p>
          <p className="text-sm leading-relaxed text-white/55">{hint}</p>
        </div>
      </section>
    );
  }

  const slide = slides[index] ?? slides[0];

  return (
    <section
      className={`relative w-full overflow-hidden bg-black ${HERO_MIN_H}`}
      aria-label="Manşet alanı"
    >
      <div className={`relative ${HERO_MIN_H} w-full`}>
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
              sizes="100vw"
              className="object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20"
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent"
              aria-hidden
            />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-12 pt-28 sm:px-6 sm:pb-14 lg:px-8 lg:pb-16 lg:pt-32">
          <div className="max-w-3xl">
            <p className="mb-3 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur">
              {slide.category}
            </p>
            <h1 className="font-display text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              <Link href={`/haber/${slide.slug}`} className="hover:text-white/90">
                {slide.title}
              </Link>
            </h1>
            <p className="mt-4 max-w-2xl text-balance text-base leading-relaxed text-white/80 sm:text-lg">
              {slide.dek}
            </p>
          </div>

          {slides.length > 1 ? (
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:border-white hover:bg-white/10"
                  aria-label="Önceki manşet"
                  onClick={() =>
                    setIndex((i) => (i - 1 + slides.length) % slides.length)
                  }
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:border-white hover:bg-white/10"
                  aria-label="Sonraki manşet"
                  onClick={() => setIndex((i) => (i + 1) % slides.length)}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-2">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Manşet ${i + 1}`}
                    aria-current={i === index}
                    onClick={() => setIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? "w-10 bg-trnet-primary" : "w-3 bg-white/35 hover:bg-white/60"
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
