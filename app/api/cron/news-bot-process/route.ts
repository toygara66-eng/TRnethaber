import { NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import {
  GEMINI_BUSY_USER_MESSAGE,
  isGeminiBusyError,
} from "@/lib/bot/gemini-client";
import { runNewsBotProcessPhase } from "@/lib/bot/pipeline";
import { getNewsBotEnvMissing } from "@/lib/env/runtime";
import { publishSavedNewsBotResults } from "@/lib/bot/news-bot-publish";
import {
  AI_TIMEOUT_DEFER_LOG,
  isAiTimeoutOrStallError,
  logAiTimeoutDefer,
  runWithCronAiBudget,
} from "@/lib/bot/cron-graceful";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handleCron(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(cronUnauthorizedResponse(), { status: 401 });
  }

  const missing = getNewsBotEnvMissing();
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Eksik ortam değişkenleri: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  try {
    const budget = await runWithCronAiBudget(() => runNewsBotProcessPhase(), 58_000);

    if (budget.status === "timeout") {
      logAiTimeoutDefer("news-bot-process");
      return NextResponse.json(
        {
          ok: true,
          success: true,
          phase: "process",
          engine: "queue-v2",
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
        },
        { status: 200 },
      );
    }

    const result = budget.value;

    if (result.deferred) {
      logAiTimeoutDefer("news-bot-process");
      return NextResponse.json(
        {
          ...result,
          ok: true,
          phase: "process",
          engine: "queue-v2",
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
        },
        { status: 200 },
      );
    }

    const savedResults = result.results.filter(
      (row): row is Extract<typeof row, { skipped: false }> => row.ok && !row.skipped,
    );

    if (savedResults.length === 0) {
      const last = result.results[result.results.length - 1];
      if (last?.ok && last.skipped && last.reason === "gemini_busy") {
        return NextResponse.json(
          {
            ...result,
            ok: true,
            phase: "process",
            message: GEMINI_BUSY_USER_MESSAGE,
          },
          { status: 200 },
        );
      }
      return NextResponse.json(
        { ...result, ok: true, phase: "process" },
        { status: 200 },
      );
    }

    const socialPosts = await publishSavedNewsBotResults(savedResults);

    return NextResponse.json(
      {
        ...result,
        ok: true,
        phase: "process",
        social: socialPosts,
      },
      { status: 201 },
    );
  } catch (err) {
    if (isGeminiBusyError(err)) {
      return NextResponse.json(
        {
          ok: true,
          phase: "process",
          message: GEMINI_BUSY_USER_MESSAGE,
        },
        { status: 200 },
      );
    }
    if (isAiTimeoutOrStallError(err)) {
      logAiTimeoutDefer("news-bot-process");
      return NextResponse.json(
        {
          ok: true,
          phase: "process",
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
        },
        { status: 200 },
      );
    }
    const message = err instanceof Error ? err.message : "Process fazı başarısız";
    console.error("[news-bot-process]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
