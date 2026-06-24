import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

/** Ana sayfa title — hedef: 50–60 karakter */
export const SITE_TITLE =
  "TRNETHABER | Türkiye Gündem, Ekonomi, Spor ve Son Dakika Haberleri";

/** Ana sayfa meta açıklama — hedef: 120–160 karakter */
export const SITE_DESCRIPTION =
  "Türkiye gündem, ekonomi, siyaset ve spor haberleri TRNETHABER'de. Son dakika gelişmeleri, sıcak başlıklar ve tarafsız analizler tek sayfada.";

export const SITE_KEYWORDS = [
  "TRNETHABER",
  "son dakika haber",
  "Türkiye gündem",
  "ekonomi haberleri",
  "spor haberleri",
  "siyaset haberleri",
  "yerel haberler",
] as const;

/** Görünür ana sayfa H1 — anahtar kelime odağı */
export const HOME_VISIBLE_H1 =
  "Türkiye gündem, ekonomi ve son dakika haberleri";

export function buildHreflangAlternates(path = "/"): NonNullable<Metadata["alternates"]> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const absolute = normalized === "/" ? SITE_URL : `${SITE_URL}${normalized}`;

  return {
    canonical: normalized,
    languages: {
      "tr-TR": absolute,
      "x-default": absolute,
    },
  };
}

export function buildRootSiteMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: SITE_TITLE,
      template: "%s · TRNETHABER",
    },
    description: SITE_DESCRIPTION,
    keywords: [...SITE_KEYWORDS],
    alternates: buildHreflangAlternates("/"),
    icons: {
      icon: "/icon.png",
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: "TRNETHABER",
      url: SITE_URL,
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function buildHomePageMetadata(): Metadata {
  return {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    keywords: [...SITE_KEYWORDS],
    alternates: buildHreflangAlternates("/"),
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: SITE_URL,
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    },
  };
}
