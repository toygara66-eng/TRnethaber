import { normalizePath, normalizeTargetUrl } from "@/lib/redirects/normalize";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseClient } from "@/lib/supabase";
import { fetchActiveRedirectsEdge } from "@/lib/redirects/fetch-active-edge";

export type BrokenLinkRow = {
  id: string;
  url: string;
  hit_count: number;
  last_detected_at: string;
  created_at: string;
};

export type RedirectRow = {
  id: string;
  from_url: string;
  to_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function logBrokenLink(rawUrl: string): Promise<void> {
  const url = normalizePath(rawUrl);
  if (url === "/404" || url.startsWith("/api/") || url.startsWith("/admin")) return;

  try {
    const supabase = createSupabaseClient();
    const now = new Date().toISOString();

    const existing = await supabase
      .from("broken_links")
      .select("id, hit_count")
      .eq("url", url)
      .maybeSingle();

    if (existing.error?.message?.includes("broken_links")) {
      return;
    }

    if (existing.data) {
      await supabase
        .from("broken_links")
        .update({
          hit_count: (existing.data.hit_count ?? 0) + 1,
          last_detected_at: now,
        })
        .eq("id", existing.data.id);
      return;
    }

    await supabase.from("broken_links").insert({
      url,
      hit_count: 1,
      last_detected_at: now,
    });
  } catch (err) {
    console.warn("[logBrokenLink]", err);
  }
}

export async function getActiveRedirectsForMiddleware(): Promise<
  { from_url: string; to_url: string }[]
> {
  return fetchActiveRedirectsEdge();
}

/** Kırık link veya manuel form — kaynak → hedef 301 kuralı */
export async function createRedirectRule(
  fromUrl: string,
  toUrl: string,
): Promise<{ ok: boolean; error?: string; from_url?: string }> {
  const from_url = normalizePath(fromUrl);
  const to_url = normalizeTargetUrl(toUrl);

  if (from_url === to_url) {
    return { ok: false, error: "Kaynak ve hedef URL aynı olamaz." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const { error: redirectError } = await supabase.from("redirects").upsert(
      {
        from_url,
        to_url,
        is_active: true,
        updated_at: now,
      },
      { onConflict: "from_url" },
    );

    if (redirectError) {
      return { ok: false, error: redirectError.message };
    }

    await supabase.from("broken_links").delete().eq("url", from_url);

    return { ok: true, from_url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Yönlendirme kaydedilemedi.",
    };
  }
}

export async function getBrokenLinksAdmin(): Promise<BrokenLinkRow[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("broken_links")
      .select("id, url, hit_count, last_detected_at, created_at")
      .order("hit_count", { ascending: false })
      .limit(200);

    if (error || !data) return [];
    return data as BrokenLinkRow[];
  } catch {
    return [];
  }
}

export async function getRedirectsAdmin(): Promise<RedirectRow[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("redirects")
      .select("id, from_url, to_url, is_active, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error || !data) return [];
    return data as RedirectRow[];
  } catch {
    return [];
  }
}

export async function createRedirectFromBrokenLink(
  fromUrl: string,
  toUrl: string,
): Promise<{ ok: boolean; error?: string; from_url?: string }> {
  return createRedirectRule(fromUrl, toUrl);
}

export async function deleteRedirect(
  id: string,
): Promise<{ ok: boolean; error?: string; from_url?: string }> {
  try {
    const supabase = createSupabaseAdminClient();
    const existing = await supabase
      .from("redirects")
      .select("from_url")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("redirects").delete().eq("id", id);

    if (error) return { ok: false, error: error.message };
    return { ok: true, from_url: existing.data?.from_url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Silinemedi.",
    };
  }
}

export async function toggleRedirectActive(
  id: string,
  isActive: boolean,
): Promise<{ ok: boolean; error?: string; from_url?: string }> {
  try {
    const supabase = createSupabaseAdminClient();
    const existing = await supabase
      .from("redirects")
      .select("from_url")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase
      .from("redirects")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    return { ok: true, from_url: existing.data?.from_url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Güncellenemedi.",
    };
  }
}
