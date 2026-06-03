import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { runEarthquakeBotPipeline } from "@/lib/bot/earthquake-pipeline";
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
    const budget = await runWithCronAiBudget(() => runEarthquakeBotPipeline());

    if (budget.status === "timeout") {
      logAiTimeoutDefer("earthquake-bot");
      return NextResponse.json(
        {
          ok: true,
          success: true,
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
        },
        { status: 200 },
      );
    }

    const result = budget.value;

    if (result.triggered) {
      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath(`/haber/${result.article.slug}`);
      for (const entity of result.entities) {
        revalidatePath(`/kimdir/${entity.slug}`);
      }
      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (isAiTimeoutOrStallError(err)) {
      logAiTimeoutDefer("earthquake-bot");
      return NextResponse.json(
        {
          ok: true,
          success: true,
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
        },
        { status: 200 },
      );
    }
    const message = err instanceof Error ? err.message : "Deprem botu başarısız";
    console.error("[earthquake-bot]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
