import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { runDarkFactory } from "@/lib/bot/factory";
import {
  GEMINI_BUSY_USER_MESSAGE,
  isGeminiBusyError,
} from "@/lib/bot/gemini-client";
import { getNewsBotEnvMissing } from "@/lib/env/runtime";
import {
  patchArticleSocialShared,
  platformsFromShareResult,
} from "@/lib/articles/social-shared-db";
import { shareToSocialMedia } from "@/lib/services/social-share";
import {
  AI_TIMEOUT_DEFER_LOG,
  isAiTimeoutOrStallError,
  logAiTimeoutDefer,
  runWithCronAiBudget,
} from "@/lib/bot/cron-graceful";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Fail-safe: sosyal paylaşım hatası haber kaydını geri almaz. */
async function distributeToSocialChannels(article: {
  id?: string;
  title: string;
  spot_metni: string;
  slug: string;
  is_breaking?: boolean;
}) {
  try {
    const result = await shareToSocialMedia({
      title: article.title,
      spot: article.spot_metni,
      slug: article.slug,
      isBreaking: article.is_breaking ?? false,
    });

    if (article.id) {
      const patch = platformsFromShareResult(result);
      if (Object.keys(patch).length > 0) {
        await patchArticleSocialShared(article.id, patch);
      }
    }

    return result;
  } catch (err) {
    console.error("[news-bot] social-share beklenmeyen hata:", err);
    return null;
  }
}

/**
 * TRNETHABER Karanlık Fabrika
 *
 * 1. Deprem botu (AFAD, >= 4.0) — varsa anında son dakika haber
 * 2. RSS mega havuz → Gemini haber + SEO → entities
 *
 * Kategori: Gemini promptunda GEMINI_NEWS_CATEGORY_RULE (lib/bot/news-category-rules.ts)
 * — siyaset → gundem; yalnızca izinli slug listesi; halüsinasyon engeli.
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
    const budget = await runWithCronAiBudget(() => runDarkFactory());

    if (budget.status === "timeout") {
      logAiTimeoutDefer("news-bot");
      return NextResponse.json(
        {
          ok: true,
          success: true,
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
          mode: "news",
        },
        { status: 200 },
      );
    }

    const factory = budget.value;
    if (factory.mode === "earthquake") {
      const result = factory.result;
      if (result.triggered) {
        const social = await distributeToSocialChannels({
          id: result.article.id,
          title: result.article.title,
          spot_metni: result.article.spot_metni,
          slug: result.article.slug,
          is_breaking: result.article.is_breaking,
        });

        revalidatePath("/");
        revalidatePath("/admin");
        revalidatePath("/admin/articles");
        revalidatePath(`/haber/${result.article.slug}`);
        for (const entity of result.entities) {
          revalidatePath(`/kimdir/${entity.slug}`);
        }

        return NextResponse.json({ mode: "earthquake", social, ...result }, { status: 201 });
      }
    }

    if (factory.mode !== "news") {
      const idle = factory.result;
      if (
        factory.mode === "earthquake" &&
        !idle.triggered &&
        idle.message === GEMINI_BUSY_USER_MESSAGE
      ) {
        return NextResponse.json(
          { ...idle, mode: "earthquake", ok: true, success: true },
          { status: 200 },
        );
      }
      return NextResponse.json(factory.result, { status: 200 });
    }

    const news = factory.result;

    if (news.deferred) {
      logAiTimeoutDefer("news-bot");
      return NextResponse.json(
        {
          ok: true,
          success: true,
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
          mode: "news",
          processed: news.processed,
          saved: news.saved,
          elapsedMs: news.elapsedMs,
          results: news.results,
        },
        { status: 200 },
      );
    }

    const savedResults = news.results.filter(
      (row): row is Extract<typeof row, { skipped: false }> => row.ok && !row.skipped,
    );

    if (savedResults.length === 0) {
      const last = news.results[news.results.length - 1];
      if (last?.ok && last.skipped && last.reason === "gemini_busy") {
        return NextResponse.json(
          {
            mode: "news",
            ok: true,
            success: true,
            message: GEMINI_BUSY_USER_MESSAGE,
            processed: news.processed,
            saved: news.saved,
            results: news.results,
          },
          { status: 200 },
        );
      }
      return NextResponse.json(
        {
          mode: "news",
          ok: true,
          processed: news.processed,
          saved: news.saved,
          results: news.results,
        },
        { status: 200 },
      );
    }

    const socialPosts = [];
    for (const row of savedResults) {
      const social = await distributeToSocialChannels({
        id: row.article.id,
        title: row.article.title,
        spot_metni: row.article.spot_metni,
        slug: row.article.slug,
        is_breaking: row.article.is_breaking,
      });
      socialPosts.push(social);

      revalidatePath(`/haber/${row.article.slug}`);
      for (const entity of row.entities) {
        revalidatePath(`/kimdir/${entity.slug}`);
      }
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/articles");
    revalidatePath("/admin/varliklar");

    return NextResponse.json(
      {
        mode: "news",
        ok: true,
        processed: news.processed,
        saved: news.saved,
        elapsedMs: news.elapsedMs,
        results: news.results,
        social: socialPosts,
      },
      { status: 201 },
    );
  } catch (err) {
    if (isGeminiBusyError(err)) {
      return NextResponse.json(
        {
          ok: true,
          success: true,
          message: GEMINI_BUSY_USER_MESSAGE,
          mode: "news",
        },
        { status: 200 },
      );
    }
    if (isAiTimeoutOrStallError(err)) {
      logAiTimeoutDefer("news-bot");
      return NextResponse.json(
        {
          ok: true,
          success: true,
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
          mode: "news",
        },
        { status: 200 },
      );
    }
    const message = err instanceof Error ? err.message : "Fabrika çalıştırılamadı";
    console.error("[news-bot]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
