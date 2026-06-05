import { getCronSecret } from "@/lib/bot/cron-auth";
import { SITE_URL } from "@/lib/site";

/** Vercel deployment kök URL — dahili cron zinciri için */
export function getCronBaseUrl(): string {
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return SITE_URL;
}

/** Aynı projede başka bir cron route'unu tetikler (ayrı 60 sn lambda). */
export async function invokeCronRoute(path: string): Promise<Response> {
  const secret = getCronSecret();
  if (!secret) {
    throw new Error("CRON_SECRET veya CRON_SECRET_KEY tanımlı değil");
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = `${getCronBaseUrl()}${normalized}`;

  return fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
}
