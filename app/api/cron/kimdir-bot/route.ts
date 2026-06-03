/**
 * kimdir-bot (Kahin)
 *
 * 1. Dinamik isim havuzu: Google Trends TR RSS + Wikipedia TR (lib/bot/google-trends-rss.ts)
 * 2. yazilmis_kisiler tablosunda kayıtlı isimler atlanır
 * 3. LLM yalnızca metin üretir (görsel URL yok) — lib/bot/kahin-gemini.ts
 * 4. Kapak: Wikipedia → Google CSE → Supabase news-images (lib/bot/kahin-person-image.ts)
 * 5. TRNETHABER anayasa kuralları (rakam/yüzde/kurum ekleri) finalize aşamasında uygulanır
 */
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { GEMINI_BUSY_USER_MESSAGE, isGeminiBusyError } from "@/lib/bot/gemini-client";
import { GOOGLE_TRENDS_TR_RSS_URL } from "@/lib/bot/google-trends-rss";
import { KIMDIR_CATEGORY_SLUG } from "@/lib/bot/kahin-gemini";
import { runKahinPipeline } from "@/lib/bot/kahin-pipeline";
import { getNewsBotEnvMissing } from "@/lib/env/runtime";
import {
  AI_TIMEOUT_DEFER_LOG,
  isAiTimeoutOrStallError,
  logAiTimeoutDefer,
  runWithCronAiBudget,
} from "@/lib/bot/cron-graceful";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handleCron(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(cronUnauthorizedResponse(), {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const missing = getNewsBotEnvMissing();
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Eksik ortam değişkenleri: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  try {
    const budget = await runWithCronAiBudget(() => runKahinPipeline());

    if (budget.status === "timeout") {
      logAiTimeoutDefer("kimdir-bot");
      return NextResponse.json(
        {
          ok: true,
          success: true,
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
          engine: "kimdir-bot-kahin-v2",
          trendsRss: GOOGLE_TRENDS_TR_RSS_URL,
          personsPerRun: 1,
        },
        { status: 200 },
      );
    }

    const result = budget.value;

    if (result.saved && result.slug) {
      revalidatePath("/");
      revalidatePath("/admin/articles");
      revalidatePath(`/haber/${result.slug}`);
      revalidatePath(`/kategori/${KIMDIR_CATEGORY_SLUG}`);
    }

    if (result.reason === "gemini_busy") {
      return NextResponse.json(
        {
          ...result,
          success: true,
          engine: "kimdir-bot-kahin-v2",
          trendsRss: GOOGLE_TRENDS_TR_RSS_URL,
          message: GEMINI_BUSY_USER_MESSAGE,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        ...result,
        engine: "kimdir-bot-kahin-v2",
        trendsRss: GOOGLE_TRENDS_TR_RSS_URL,
        maxDurationSec: 60,
        personsPerRun: 1,
      },
      { status: result.saved ? 201 : 200 },
    );
  } catch (err) {
    if (isGeminiBusyError(err)) {
      return NextResponse.json(
        {
          ok: true,
          success: true,
          engine: "kimdir-bot-kahin-v2",
          message: GEMINI_BUSY_USER_MESSAGE,
        },
        { status: 200 },
      );
    }

    if (isAiTimeoutOrStallError(err)) {
      logAiTimeoutDefer("kimdir-bot");
      return NextResponse.json(
        {
          ok: true,
          success: true,
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
          engine: "kimdir-bot-kahin-v2",
        },
        { status: 200 },
      );
    }

    const message = err instanceof Error ? err.message : "kimdir-bot başarısız";
    console.error("[kimdir-bot]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
