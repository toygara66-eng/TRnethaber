import { Cormorant_Garamond } from "next/font/google";

/** Kurumsal TRNETHABER logosu — tırnaklı serif (Outfit/Inter'dan bağımsız) */
export const brandLogoFont = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-logo",
  display: "swap",
});

/** Logo metnine uygulanacak sınıflar */
export const brandLogoClassName = `${brandLogoFont.className} font-semibold tracking-[0.08em]`;
