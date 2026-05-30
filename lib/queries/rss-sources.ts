import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RssSourceRow = {
  id: string;
  name: string;
  url: string;
  city: string;
  /** Yerel bot sentetik kaynakları — articles.city_slug ile eşleşir */
  city_slug?: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RssSourceInput = {
  name: string;
  url: string;
  city: string;
  category: string;
  is_active?: boolean;
};

export type RssSourceActionResult = {
  ok: boolean;
  error?: string;
};

function mapRow(raw: Record<string, unknown>): RssSourceRow {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    url: String(raw.url ?? ""),
    city: String(raw.city ?? ""),
    category: String(raw.category ?? ""),
    is_active: raw.is_active !== false,
    created_at: String(raw.created_at ?? ""),
    updated_at: String(raw.updated_at ?? ""),
  };
}

export async function getActiveRssSources(): Promise<RssSourceRow[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("rss_sources")
      .select("id, name, url, city, category, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("city", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("[getActiveRssSources]", error.message);
      return [];
    }

    return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  } catch (err) {
    console.error("[getActiveRssSources]", err);
    return [];
  }
}

export async function getAdminRssSources(): Promise<RssSourceRow[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("rss_sources")
      .select("id, name, url, city, category, is_active, created_at, updated_at")
      .order("city", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("[getAdminRssSources]", error.message);
      return [];
    }

    return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  } catch (err) {
    console.error("[getAdminRssSources]", err);
    return [];
  }
}

export async function createRssSource(
  input: RssSourceInput,
): Promise<RssSourceActionResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("rss_sources").insert({
      name: input.name,
      url: input.url,
      city: input.city || null,
      category: input.category || null,
      is_active: input.is_active ?? true,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Bu RSS URL zaten kayıtlı." };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Kayıt başarısız.",
    };
  }
}

export async function updateRssSource(
  id: string,
  input: RssSourceInput,
): Promise<RssSourceActionResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("rss_sources")
      .update({
        name: input.name,
        url: input.url,
        city: input.city || null,
        category: input.category || null,
        is_active: input.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Bu RSS URL başka bir kayıtta kullanılıyor." };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Güncelleme başarısız.",
    };
  }
}

export async function deleteRssSource(id: string): Promise<RssSourceActionResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("rss_sources").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Silme başarısız.",
    };
  }
}

export async function toggleRssSourceActive(
  id: string,
  isActive: boolean,
): Promise<RssSourceActionResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("rss_sources")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Durum güncellenemedi.",
    };
  }
}
