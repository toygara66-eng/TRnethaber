import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { runDarkFactory } from "@/lib/bot/factory";
import { GEMINI_BUSY_USER_MESSAGE } from "@/lib/bot/gemini-client";
import { getNewsBotEnvMissing } from "@/lib/env/runtime";
import {
  patchArticleSocialShared,
  platformsFromShareResult,
} from "@/lib/articles/social-shared-db";
import { shareToSocialMedia } from "@/lib/services/social-share";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

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
    const factory = await runDarkFactory();
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
    if (news.skipped) {
      if (news.reason === "gemini_busy") {
        return NextResponse.json(
          {
            ...news,
            mode: "news",
            ok: true,
            success: true,
            message: GEMINI_BUSY_USER_MESSAGE,
          },
          { status: 200 },
        );
      }
      return NextResponse.json({ mode: "news", ...news }, { status: 200 });
    }

    const social = await distributeToSocialChannels({
      id: news.article.id,
      title: news.article.title,
      spot_metni: news.article.spot_metni,
      slug: news.article.slug,
      is_breaking: news.article.is_breaking,
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/articles");
    revalidatePath("/admin/varliklar");
    revalidatePath(`/haber/${news.article.slug}`);
    for (const entity of news.entities) {
      revalidatePath(`/kimdir/${entity.slug}`);
    }

    return NextResponse.json({ mode: "news", social, ...news }, { status: 201 });
  } catch (err) {
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
