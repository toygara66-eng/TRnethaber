import { SITE_URL } from "@/lib/site";

/** Kanonik site kökü — sitemap, robots, metadataBase, JSON-LD */
export function getSiteBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();

  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  return SITE_URL.replace(/\/$/, "") || "http://localhost:3000";
}
