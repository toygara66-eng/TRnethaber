import type { RssPickMeta } from "@/lib/bot/rss-fetcher";
import type { AgencyWire } from "@/lib/bot/types";
import type { Json } from "@/lib/supabase/database";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function toJson(value: unknown): Json {
  return value as Json;
}

export type NewsBotQueueStatus =
  | "pending"
  | "processing"
  | "completed"
  | "skipped"
  | "failed";

export type NewsBotQueueRow = {
  id: string;
  status: NewsBotQueueStatus;
  source: "rss" | "mock";
  wire_payload: AgencyWire;
  rss_meta: RssPickMeta | null;
  result_payload: unknown | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
};

const STALE_PROCESSING_MS = 10 * 60 * 1000;

function isMissingQueueTableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes("news_bot_queue") ||
    msg.includes("does not exist") ||
    msg.includes("42p01") ||
    msg.includes("schema cache")
  );
}

/** Kuyruk tablosu migration'ı uygulanmış mı? */
export async function isNewsBotQueueAvailable(): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("news_bot_queue")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

export async function resetStaleProcessingJobs(): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  const { data, error } = await supabase
    .from("news_bot_queue")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("status", "processing")
    .lt("updated_at", cutoff)
    .select("id");

  if (error) {
    console.warn("[news-bot-queue] stale reset:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

export async function enqueueWireJob(input: {
  wire: AgencyWire;
  source: "rss" | "mock";
  rss?: RssPickMeta;
}): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("news_bot_queue")
    .insert({
      status: "pending",
      source: input.source,
      wire_payload: toJson(input.wire),
      rss_meta: input.rss ? toJson(input.rss) : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    const message = error?.message ?? "kayıt dönmedi";
    if (isMissingQueueTableError(error)) {
      throw new Error("news_bot_queue_missing");
    }
    throw new Error(`Kuyruk insert: ${message}`);
  }
  return data.id;
}

export async function countPendingQueueJobs(): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from("news_bot_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) throw new Error(`Kuyruk sayımı: ${error.message}`);
  return count ?? 0;
}

export async function listPendingQueueJobs(limit: number): Promise<NewsBotQueueRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("news_bot_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Kuyruk listesi: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status as NewsBotQueueStatus,
    source: row.source as "rss" | "mock",
    wire_payload: row.wire_payload as AgencyWire,
    rss_meta: (row.rss_meta as RssPickMeta | null) ?? null,
    result_payload: row.result_payload,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
    processed_at: row.processed_at,
  }));
}

export async function markQueueJobProcessing(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("news_bot_queue")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`Kuyruk processing: ${error.message}`);
}

export async function markQueueJobPending(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("news_bot_queue")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`Kuyruk pending: ${error.message}`);
}

export async function markQueueJobCompleted(
  id: string,
  resultPayload?: unknown,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("news_bot_queue")
    .update({
      status: "completed",
      result_payload: resultPayload != null ? toJson(resultPayload) : null,
      processed_at: now,
      updated_at: now,
    })
    .eq("id", id);

  if (error) throw new Error(`Kuyruk completed: ${error.message}`);
}

export async function markQueueJobSkipped(
  id: string,
  reason: string,
  resultPayload?: unknown,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("news_bot_queue")
    .update({
      status: "skipped",
      error_message: reason,
      result_payload: resultPayload != null ? toJson(resultPayload) : null,
      processed_at: now,
      updated_at: now,
    })
    .eq("id", id);

  if (error) throw new Error(`Kuyruk skipped: ${error.message}`);
}
