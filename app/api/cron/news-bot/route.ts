import { NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import {
  GEMINI_BUSY_USER_MESSAGE,
  isGeminiBusyError,
} from "@/lib/bot/gemini-client";
import { runNewsBotOrchestratorInline } from "@/lib/bot/news-bot-orchestrator";
import { publishSavedNewsBotResults } from "@/lib/bot/news-bot-publish";
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

/**
 * TRNETHABER haber botu — fetch + process aynı istekte tamamlanır.
 * Yanıtta saved / processed / pending alanları gerçek sonucu gösterir.
 */
async function handleCron(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(cronUnauthorizedResponse(), { status: 401 });
  }

  const missing = getNewsBotEnvMissing();
  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Eksik ortam değişkenleri: ${missing.join(", ")}. Vercel Dashboard → Environment Variables`,
      },
      { status: 500 },
    );
  }

  try {
    const budget = await runWithCronAiBudget(
      () => runNewsBotOrchestratorInline(),
      59_000,
    );

    if (budget.status === "timeout") {
      logAiTimeoutDefer("news-bot");
      return NextResponse.json(
        {
          ok: true,
          engine: "queue-v2",
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
          saved: 0,
        },
        { status: 200 },
      );
    }

    const { fetch, process } = budget.value;
    const savedResults = process.results.filter(
      (row): row is Extract<typeof row, { skipped: false }> =>
        row.ok && !row.skipped,
    );
    const last = process.results[process.results.length - 1];

    if (savedResults.length > 0) {
      const social = await publishSavedNewsBotResults(savedResults);
      return NextResponse.json(
        {
          ok: true,
          engine: "queue-v2",
          saved: process.saved,
          processed: process.processed,
          pending: process.pending,
          deferred: process.deferred,
          elapsedMs: process.elapsedMs,
          fetch,
          process,
          social,
          articles: savedResults.map((r) => ({
            id: r.article.id,
            slug: r.article.slug,
            title: r.article.title,
          })),
        },
        { status: 201 },
      );
    }

    if (last?.ok && last.skipped && last.reason === "gemini_busy") {
      return NextResponse.json(
        {
          ok: true,
          engine: "queue-v2",
          saved: 0,
          processed: process.processed,
          pending: process.pending,
          deferred: process.deferred,
          message: GEMINI_BUSY_USER_MESSAGE,
          fetch,
          process,
          lastResult: last,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        engine: "queue-v2",
        saved: 0,
        processed: process.processed,
        pending: process.pending,
        deferred: process.deferred,
        fetch,
        process,
        lastResult: last ?? null,
        hint:
          process.pending > 0
            ? "Kuyrukta bekleyen haber var; /api/cron/news-bot-process çalıştırın."
            : "Haber kaydedilmedi (mükerrer veya AI atlandı). lastResult alanına bakın.",
      },
      { status: 200 },
    );
  } catch (err) {
    if (isGeminiBusyError(err)) {
      return NextResponse.json(
        {
          ok: true,
          engine: "queue-v2",
          saved: 0,
          message: GEMINI_BUSY_USER_MESSAGE,
        },
        { status: 200 },
      );
    }
    if (isAiTimeoutOrStallError(err)) {
      logAiTimeoutDefer("news-bot");
      return NextResponse.json(
        {
          ok: true,
          engine: "queue-v2",
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
          saved: 0,
        },
        { status: 200 },
      );
    }
    const message = err instanceof Error ? err.message : "Haber botu başarısız";
    console.error("[news-bot]", err);
    return NextResponse.json({ ok: false, error: message, engine: "queue-v2" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
