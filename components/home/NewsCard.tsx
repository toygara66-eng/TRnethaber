"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { HomeCard } from "@/lib/types/home";
import { SafeImage } from "@/components/ui/SafeImage";

type Props = {
  card: HomeCard;
  href: string;
};

export function NewsCard({ card, href }: Props) {
  return (
    <motion.article
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="group h-full"
    >
      <Link
        href={href}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-trnet-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03] transition-shadow hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)]"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-trnet-surface">
          <SafeImage
            src={card.imageSrc}
            alt={card.imageAlt}
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-trnet-primary">
            <span>{card.category}</span>
            <span className="text-trnet-text/60">{card.readCountLabel}</span>
          </div>
          <h3 className="text-balance font-display text-lg font-semibold leading-snug text-trnet-text sm:text-xl">
            {card.title}
          </h3>
        </div>
      </Link>
    </motion.article>
  );
}
