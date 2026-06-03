import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { runLocalNewsPipeline } from "@/lib/bot/local-news-pipeline";
import { getYerelSlugForCity } from "@/lib/user-city";
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
    const budget = await runWithCronAiBudget(() => runLocalNewsPipeline());

    if (budget.status === "timeout") {
      logAiTimeoutDefer("fetch-local-news");
      return NextResponse.json(
        {
          ok: true,
          success: true,
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
          engine: "local-news-random-city-v1",
          savedCount: 0,
        },
        { status: 200 },
      );
    }

    const result = budget.value;

    if (result.savedCount > 0) {
      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath("/admin/articles");
      revalidatePath(`/kategori/${result.city.slug}`);
      revalidatePath("/kategori/yerel-haberler");

      const yerelCat = getYerelSlugForCity(result.city.name);
      if (yerelCat) {
        revalidatePath(`/kategori/${yerelCat}`);
      }

      for (const row of result.results) {
        if (row.ok && row.saved && row.slug) {
          revalidatePath(`/haber/${row.slug}`);
        }
      }
      revalidatePath("/sitemap.xml");
    }

    return NextResponse.json(
      {
        ok: result.ok,
        engine: "local-news-random-city-v1",
        city: result.city,
        feeds: result.feeds.map((f) => ({ id: f.id, name: f.name, url: f.url })),
        feedsTried: result.feedsTried,
        savedCount: result.savedCount,
        candidatesChecked: result.candidatesChecked,
        errors: result.errors,
        results: result.results,
      },
      { status: result.savedCount > 0 ? 201 : 200 },
    );
  } catch (err) {
    if (isAiTimeoutOrStallError(err)) {
      logAiTimeoutDefer("fetch-local-news");
      return NextResponse.json(
        {
          ok: true,
          success: true,
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
          engine: "local-news-random-city-v1",
        },
        { status: 200 },
      );
    }
    const message = err instanceof Error ? err.message : "Yerel haber cron başarısız";
    console.error("[fetch-local-news]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
