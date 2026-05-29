"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import type { HomeCard } from "@/lib/types/home";
import { haberArticleHref, normalizeHomeCard } from "@/lib/articles/list-card";
import { SafeImage } from "@/components/ui/SafeImage";
import { EDITORIAL_IMAGE_CLASS } from "@/lib/images/editorial-image";

type Props = {
  card: HomeCard;
};

export function NewsCard({ card }: Props) {
  const safeCard = useMemo(() => normalizeHomeCard(card), [card]);
  const href = haberArticleHref(safeCard.slug);

  return (
    <motion.article
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="group h-full"
    >
      <Link
        href={href}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-trnet-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03] transition-shadow hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)]"
        aria-disabled={href === "#" ? true : undefined}
        onClick={href === "#" ? (e) => e.preventDefault() : undefined}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#1a1a1a]">
          <SafeImage
            src={safeCard.imageSrc}
            alt={safeCard.imageAlt}
            fill
            placeholderVariant="card"
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
            className={`${EDITORIAL_IMAGE_CLASS} transition-transform duration-500 group-hover:scale-[1.04]`}
          />
        </div>
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-trnet-primary">
            <span>{safeCard.category}</span>
          </div>
          <h3 className="text-balance font-display text-lg font-semibold leading-snug text-trnet-text sm:text-xl">
            {safeCard.title}
          </h3>
        </div>
      </Link>
    </motion.article>
  );
}
