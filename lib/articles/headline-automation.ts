import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const HEADLINE_MAX_SLOTS = 10;
export const HEADLINE_ROTATE_HOURS = 6;

export type HeadlineField = "is_headline" | "is_top_headline";

export type HeadlineFlags = {
  is_headline: boolean;
  is_top_headline: boolean;
};

export function isMissingHeadlineColumn(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("is_headline") ||
    message.includes("is_top_headline") ||
    message.includes("importance_score") ||
    message.includes("is_manset") ||
    message.includes("is_ust_manset") ||
    message.includes("does not exist")
  );
}

/** Gemini JSON importance_score → 1..10 */
export function parseImportanceScore(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.min(10, Math.max(1, Math.round(raw)));
  }
  if (typeof raw === "string") {
    const n = Number.parseInt(raw.trim(), 10);
    if (Number.isFinite(n)) return Math.min(10, Math.max(1, n));
  }
  return 1;
}

/** Puan → vitrin bayrakları (ana manşet öncelikli). */
export function headlineFlagsFromScore(score: number): HeadlineFlags {
  const s = Math.min(10, Math.max(1, Math.round(score)));
  if (s >= 8) {
    return { is_headline: true, is_top_headline: false };
  }
  if (s >= 5) {
    return { is_headline: false, is_top_headline: true };
  }
  return { is_headline: false, is_top_headline: false };
}

function rotateCutoffIso(): string {
  return new Date(Date.now() - HEADLINE_ROTATE_HOURS * 60 * 60 * 1000).toISOString();
}

/** 6 saatten eski tüm manşet/üst manşet bayraklarını kapatır. */
export async function rotateExpiredHeadlines(): Promise<{
  cleared: number;
  error?: string;
}> {
  const supabase = createSupabaseAdminClient();
  const cutoff = rotateCutoffIso();

  const { data, error } = await supabase
    .from("articles")
    .update({
      is_headline: false,
      is_top_headline: false,
      is_manset: false,
      is_ust_manset: false,
      updated_at: new Date().toISOString(),
    })
    .or(`is_headline.eq.true,is_top_headline.eq.true,is_manset.eq.true,is_ust_manset.eq.true`)
    .lt("created_at", cutoff)
    .select("id");

  if (error?.message && isMissingHeadlineColumn(error.message)) {
    const legacy = await supabase
      .from("articles")
      .update({
        is_manset: false,
        is_ust_manset: false,
        updated_at: new Date().toISOString(),
      })
      .or("is_manset.eq.true,is_ust_manset.eq.true")
      .lt("created_at", cutoff)
      .select("id");
    if (legacy.error) {
      console.error("[rotateExpiredHeadlines] legacy:", legacy.error);
      return { cleared: 0, error: legacy.error.message };
    }
    return { cleared: legacy.data?.length ?? 0 };
  }

  if (error) {
    console.error("[rotateExpiredHeadlines]", error);
    return { cleared: 0, error: error.message };
  }

  return { cleared: data?.length ?? 0 };
}

/** Ana manşet slotu doluysa en eski is_headline kayıtlarını kapatır (max 10). */
export async function enforceHeadlineSlotLimit(): Promise<number> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("articles")
    .select("id, created_at")
    .eq("is_headline", true)
    .order("created_at", { ascending: true });

  if (error?.message && isMissingHeadlineColumn(error.message)) {
    const legacy = await supabase
      .from("articles")
      .select("id, created_at")
      .eq("is_ust_manset", true)
      .order("created_at", { ascending: true });
    if (!legacy.data || legacy.data.length <= HEADLINE_MAX_SLOTS) return 0;
    const excess = legacy.data.length - HEADLINE_MAX_SLOTS;
    const toClear = legacy.data.slice(0, excess);
    for (const row of toClear) {
      await supabase
        .from("articles")
        .update({ is_ust_manset: false, updated_at: new Date().toISOString() })
        .eq("id", row.id);
    }
    return toClear.length;
  }

  if (error || !data || data.length <= HEADLINE_MAX_SLOTS) {
    if (error) console.error("[enforceHeadlineSlotLimit]", error);
    return 0;
  }

  const excess = data.length - HEADLINE_MAX_SLOTS;
  const toClear = data.slice(0, excess);
  const now = new Date().toISOString();

  for (const row of toClear) {
    await supabase
      .from("articles")
      .update({
        is_headline: false,
        is_ust_manset: false,
        updated_at: now,
      })
      .eq("id", row.id);
  }

  return toClear.length;
}

/** Yeni haber kaydı sonrası otonom vitrin ataması. */
export async function applyAutonomousHeadlineFlags(
  articleId: string,
  importanceScore: number,
): Promise<{ ok: boolean; flags: HeadlineFlags; error?: string }> {
  const flags = headlineFlagsFromScore(importanceScore);
  const supabase = createSupabaseAdminClient();

  const patch = {
    importance_score: Math.min(10, Math.max(1, Math.round(importanceScore))),
    is_headline: flags.is_headline,
    is_top_headline: flags.is_top_headline,
    is_manset: flags.is_top_headline,
    is_ust_manset: flags.is_headline,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("articles").update(patch).eq("id", articleId);

  if (error?.message && isMissingHeadlineColumn(error.message)) {
    const legacy = await supabase
      .from("articles")
      .update({
        is_manset: flags.is_top_headline,
        is_ust_manset: flags.is_headline,
        updated_at: patch.updated_at,
      })
      .eq("id", articleId);
    if (legacy.error) {
      return { ok: false, flags, error: legacy.error.message };
    }
    if (flags.is_headline) await enforceHeadlineSlotLimit();
    return { ok: true, flags };
  }

  if (error) {
    return { ok: false, flags, error: error.message };
  }

  if (flags.is_headline) {
    await enforceHeadlineSlotLimit();
  }

  return { ok: true, flags };
}
