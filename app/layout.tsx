import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://trnethaber.vercel.app"),
  title: {
    default: "TRNETHABER",
    template: "%s · TRNETHABER",
  },
  description:
    "Türkiye merkezli premium dijital haber vitrini. Gündem, ekonomi ve yerel başlıklar.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "TRNETHABER",
    title: "TRNETHABER",
    description:
      "Türkiye merkezli premium dijital haber vitrini. Gündem, ekonomi ve yerel başlıklar.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TRNETHABER",
    description:
      "Türkiye merkezli premium dijital haber vitrini. Gündem, ekonomi ve yerel başlıklar.",
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
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
