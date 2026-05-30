import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { SiteAnalytics } from "@/components/analytics/SiteAnalytics";
import { SiteJsonLd } from "@/components/layout/SiteJsonLd";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { getSiteBaseUrl } from "@/lib/site-url";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const SITE_TITLE =
  "TRNETHABER - Türkiye'nin Premium Dijital Haber Vitrini | Son Dakika ve Güncel Haberler";

const SITE_DESCRIPTION =
  "Türkiye merkezli premium dijital haber vitrini. Gündem, ekonomi, siyaset, spor, magazin ve yerel haberler.";

/** public/icon.png ve public/apple-touch-icon.png */
const SITE_ICONS: NonNullable<Metadata["icons"]> = {
  icon: "/icon.png",
  apple: "/apple-touch-icon.png",
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteBaseUrl()),
  title: {
    default: SITE_TITLE,
    template: "%s · TRNETHABER",
  },
  description: SITE_DESCRIPTION,
  icons: SITE_ICONS,
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "TRNETHABER",
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

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh font-sans">
        <SiteJsonLd />
        <AuthProvider>{children}</AuthProvider>
        <SiteAnalytics />
      </body>
    </html>
  );
}
