"use client";

import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getSocialProfileLinksFallback,
  type SocialProfileId,
  type SocialProfileLink,
} from "@/lib/data/social-links";

const ICON_STYLES: Record<SocialProfileId, string> = {
  x: "bg-white/10 text-white hover:bg-white/20 hover:text-white",
  facebook: "bg-[#1877F2]/15 text-[#6BA3FF] hover:bg-[#1877F2]/25",
  instagram: "bg-[#E4405F]/15 text-[#FF8FAB] hover:bg-[#E4405F]/25",
  telegram: "bg-[#26A5E4]/15 text-[#7DD3FC] hover:bg-[#26A5E4]/25",
  youtube: "bg-[#FF0000]/15 text-[#FF8A8A] hover:bg-[#FF0000]/25",
};

function SocialIcon({ id }: { id: SocialProfileId }) {
  const base = "h-5 w-5 shrink-0";

  switch (id) {
    case "x":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="currentColor" aria-hidden>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="currentColor" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      );
    case "telegram":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="currentColor" aria-hidden>
          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="currentColor" aria-hidden>
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    default:
      return null;
  }
}

function SocialLinkRow({ link }: { link: SocialProfileLink }) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-white/8 px-3 py-2.5 transition hover:border-white/20 hover:bg-white/[0.04]"
    >
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${ICON_STYLES[link.id]}`}
      >
        <SocialIcon id={link.id} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white group-hover:text-white">
          {link.label}
        </span>
        <span className="block truncate text-xs text-white/50 group-hover:text-white/65">
          {link.handle}
        </span>
      </span>
    </a>
  );
}

export function SocialFollowCard() {
  const [links, setLinks] = useState<SocialProfileLink[]>(() =>
    getSocialProfileLinksFallback(),
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/social-profiles", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { links?: SocialProfileLink[] };
        if (!cancelled && Array.isArray(data.links) && data.links.length > 0) {
          setLinks(data.links);
        }
      } catch {
        /* fallback listesi kalır */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (links.length === 0) return null;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-white/10 bg-trnet-black shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
      aria-label="Sosyal medya hesaplarımız"
    >
      <header className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <Share2 className="h-4 w-4 text-trnet-primary" aria-hidden />
        <h2 className="font-display text-sm font-semibold tracking-wide text-white">
          Sosyal Medyada Bizi Takip Edin
        </h2>
      </header>
      <div className="space-y-2 p-4">
        <p className="text-[11px] leading-relaxed text-white/45">
          Son dakika haberleri ve gündem özetleri için hesaplarımıza katılın.
        </p>
        <div className="space-y-2">
          {links.map((link) => (
            <SocialLinkRow key={link.id} link={link} />
          ))}
        </div>
      </div>
    </section>
  );
}
