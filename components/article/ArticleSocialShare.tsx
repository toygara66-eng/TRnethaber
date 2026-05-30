"use client";

import { Facebook, Link2, MessageCircle } from "lucide-react";
import { absoluteUrl } from "@/lib/site";

type Props = {
  title: string;
  slug: string;
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function buildShareLinks(title: string, slug: string) {
  const pageUrl = absoluteUrl(`/haber/${slug}`);
  const text = encodeURIComponent(title);
  const url = encodeURIComponent(pageUrl);

  return {
    pageUrl,
    x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${pageUrl}`)}`,
  };
}

const buttonClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] bg-trnet-card text-trnet-text/80 transition hover:border-trnet-primary/40 hover:bg-trnet-primary/10 hover:text-trnet-primary";

export function ArticleSocialShare({ title, slug }: Props) {
  const links = buildShareLinks(title, slug);

  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-2 border-b border-black/[0.06] pb-6 sm:mb-8"
      aria-label="Haberi paylaş"
    >
      <span className="mr-1 text-xs font-semibold uppercase tracking-[0.14em] text-trnet-text/45">
        Paylaş
      </span>
      <a
        href={links.x}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        aria-label="X (Twitter) üzerinde paylaş"
      >
        <XIcon className="h-4 w-4" />
      </a>
      <a
        href={links.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        aria-label="Facebook'ta paylaş"
      >
        <Facebook className="h-4 w-4" aria-hidden />
      </a>
      <a
        href={links.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        aria-label="WhatsApp'ta paylaş"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
      </a>
      <button
        type="button"
        className={buttonClass}
        aria-label="Bağlantıyı kopyala"
        onClick={() => {
          void navigator.clipboard?.writeText(links.pageUrl);
        }}
      >
        <Link2 className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
