import type { RssPickMeta } from "@/lib/bot/rss-fetcher";
import type { AgencyWire } from "@/lib/bot/types";
import type { Json } from "@/lib/supabase/database";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function toJson(value: unknown): Json {
  return value as Json;
}

/** wire_payload içinde saklanan zarf — source/rss_meta kolonları olmasa da çalışır */
export type QueuedWireEnvelope = {
  wire: AgencyWire;
  source?: "rss" | "mock";
  rss?: RssPickMeta;
};

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
  wire: AgencyWire;
  rss?: RssPickMeta;
  result_payload: unknown | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
};

const STALE_PROCESSING_MS = 10 * 60 * 1000;

function isMissingQueueSchemaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes("news_bot_queue") ||
    msg.includes("does not exist") ||
    msg.includes("42p01") ||
    msg.includes("schema cache") ||
    msg.includes("rss_meta") ||
    msg.includes("result_payload")
  );
}

function isMissingSourceColumnError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return msg.includes(".source") && msg.includes("does not exist");
}

function parseStoredWirePayload(raw: unknown, rssMetaColumn: unknown): {
  wire: AgencyWire;
  source: "rss" | "mock";
  rss?: RssPickMeta;
} {
  const fromColumn = rssMetaColumn as RssPickMeta | null | undefined;
  if (!raw || typeof raw !== "object") {
    throw new Error("Kuyruk wire_payload geçersiz");
  }

  if ("wire" in raw && (raw as QueuedWireEnvelope).wire) {
    const envelope = raw as QueuedWireEnvelope;
    return {
      wire: envelope.wire,
      source: envelope.source ?? "rss",
      rss: envelope.rss ?? fromColumn ?? undefined,
    };
  }

  return {
    wire: raw as AgencyWire,
    source: "rss",
    rss: fromColumn ?? undefined,
  };
}

function buildWireEnvelope(input: {
  wire: AgencyWire;
  source: "rss" | "mock";
  rss?: RssPickMeta;
}): QueuedWireEnvelope {
  return input.rss
    ? { wire: input.wire, source: input.source, rss: input.rss }
    : { wire: input.wire, source: input.source };
}

/** Kuyruk tablosu erişilebilir mi? */
export async function isNewsBotQueueAvailable(): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("news_bot_queue")
      .select("id, wire_payload", { head: true, count: "exact" })
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
  const envelope = buildWireEnvelope(input);
  const wirePayload = toJson(envelope);

  let { data, error } = await supabase
    .from("news_bot_queue")
    .insert({ status: "pending", wire_payload: wirePayload })
    .select("id")
    .single();

  if (error) {
    const msg = error.message.toLowerCase();
    const sourceRequired =
      msg.includes("source") ||
      msg.includes("not-null") ||
      msg.includes("null value");
    if (sourceRequired && !isMissingSourceColumnError(error)) {
      const retry = await supabase
        .from("news_bot_queue")
        .insert({
          status: "pending",
          source: input.source,
          wire_payload: wirePayload,
        })
        .select("id")
        .single();
      data = retry.data;
      error = retry.error;
    }
  }

  if (error || !data) {
    const message = error?.message ?? "kayıt dönmedi";
    if (isMissingQueueSchemaError(error)) {
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
    .select("id, status, wire_payload, created_at, updated_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    if (isMissingQueueSchemaError(error)) {
      throw new Error("news_bot_queue_missing");
    }
    throw new Error(`Kuyruk listesi: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const parsed = parseStoredWirePayload(row.wire_payload, null);
    return {
      id: row.id,
      status: row.status as NewsBotQueueStatus,
      source: parsed.source,
      wire: parsed.wire,
      rss: parsed.rss,
      result_payload: null,
      error_message: null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      processed_at: null,
    };
  });
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

type QueueUpdate = {
  status?: string;
  updated_at?: string;
  processed_at?: string | null;
  error_message?: string | null;
  result_payload?: Json | null;
};

async function updateQueueJob(id: string, patch: QueueUpdate): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("news_bot_queue").update(patch).eq("id", id);

  if (!error) return;

  if (isMissingQueueSchemaError(error)) {
    const { result_payload: _rp, error_message: _em, processed_at: _pa, ...minimal } =
      patch;
    const { error: retryError } = await supabase
      .from("news_bot_queue")
      .update(minimal)
      .eq("id", id);
    if (!retryError) return;
    throw new Error(`Kuyruk güncelleme: ${retryError.message}`);
  }

  throw new Error(`Kuyruk güncelleme: ${error.message}`);
}

export async function markQueueJobCompleted(
  id: string,
  resultPayload?: unknown,
): Promise<void> {
  const now = new Date().toISOString();
  await updateQueueJob(id, {
    status: "completed",
    result_payload: resultPayload != null ? toJson(resultPayload) : null,
    processed_at: now,
    updated_at: now,
  });
}

export async function markQueueJobSkipped(
  id: string,
  reason: string,
  resultPayload?: unknown,
): Promise<void> {
  const now = new Date().toISOString();
  await updateQueueJob(id, {
    status: "skipped",
    error_message: reason,
    result_payload: resultPayload != null ? toJson(resultPayload) : null,
    processed_at: now,
    updated_at: now,
  });
}
