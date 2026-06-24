import { normalizePath } from "@/lib/redirects/normalize";

export type ActiveRedirectRow = {
  from_url: string;
  to_url: string;
};

/** Edge middleware — Supabase REST (ORM/cookie yok) */
export async function fetchActiveRedirectsEdge(): Promise<ActiveRedirectRow[]> {
  const base = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL
  )
    ?.trim()
    .replace(/\/$/, "");

  const apiKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY
  )?.trim();

  if (!base || !apiKey) {
    return [];
  }

  const endpoint = new URL(`${base}/rest/v1/redirects`);
  endpoint.searchParams.set("select", "from_url,to_url");
  endpoint.searchParams.set("is_active", "eq.true");

  try {
    const res = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 404 || res.status === 400) {
        console.warn("[redirects-edge] Tablo erişilemedi:", res.status);
      }
      return [];
    }

    const data = (await res.json()) as { from_url: string; to_url: string }[];
    if (!Array.isArray(data)) return [];

    return data.map((row) => ({
      from_url: normalizePath(row.from_url),
      to_url: row.to_url.trim(),
    }));
  } catch (err) {
    console.warn("[redirects-edge] fetch hatası:", err);
    return [];
  }
}
