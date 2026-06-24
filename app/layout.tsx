import type { Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { brandLogoFont } from "@/lib/fonts/brand-logo";
import { SiteAnalytics } from "@/components/analytics/SiteAnalytics";
import { SiteJsonLd } from "@/components/layout/SiteJsonLd";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { buildRootSiteMetadata } from "@/lib/seo/site-metadata";
import "./globals.css";

const display = Outfit({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = buildRootSiteMetadata();

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
    <html lang="tr" className={`${display.variable} ${sans.variable} ${brandLogoFont.variable}`}>
      <body className="min-h-dvh font-sans">
        <SiteJsonLd />
        <AuthProvider>{children}</AuthProvider>
        <SiteAnalytics />
      </body>
    </html>
  );
}
