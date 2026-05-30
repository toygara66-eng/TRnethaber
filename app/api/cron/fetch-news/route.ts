import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { runFetchNewsPipeline } from "@/lib/bot/fetch-news-pipeline";
import { GEMINI_BUSY_USER_MESSAGE } from "@/lib/bot/gemini-client";
import { getNewsBotEnvMissing } from "@/lib/env/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

async function handleCron(request: NextRequest) {
  // Bearer CRON_SECRET veya ?secret=<CRON_SECRET_KEY> — request.nextUrl.searchParams
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
    const result = await runFetchNewsPipeline();

    if (result.savedCount > 0) {
      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath("/admin/articles");
      for (const row of result.results) {
        if (row.ok && row.saved && row.slug) {
          revalidatePath(`/haber/${row.slug}`);
        }
      }
      revalidatePath("/sitemap.xml");
      revalidatePath("/api/articles/most-read");
    }

    const geminiBusySkipped = result.results.some(
      (row) => row.ok && !row.saved && row.reason === "gemini_busy",
    );

    if (geminiBusySkipped && result.savedCount === 0) {
      return NextResponse.json(
        {
          ok: true,
          success: true,
          message: GEMINI_BUSY_USER_MESSAGE,
          engine: "fetch-news-zeki-assembler-v1",
          savedCount: result.savedCount,
          sourcesScanned: result.sourcesScanned,
          sourcesTotal: result.sourcesTotal,
          candidatesChecked: result.candidatesChecked,
          errors: result.errors,
          results: result.results,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        ok: result.ok,
        engine: "fetch-news-zeki-assembler-v1",
        savedCount: result.savedCount,
        sourcesScanned: result.sourcesScanned,
        sourcesTotal: result.sourcesTotal,
        candidatesChecked: result.candidatesChecked,
        errors: result.errors,
        results: result.results,
      },
      { status: result.savedCount > 0 ? 201 : 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch-news başarısız";
    console.error("[fetch-news]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
