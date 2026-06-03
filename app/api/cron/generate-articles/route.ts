import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { TURKIYE_ILLER, type TurkiyeIl } from "@/lib/data/turkiye-iller";
import { getNewsBotEnvMissing } from "@/lib/env/runtime";
import { slugifyTitle } from "@/lib/slug";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  processArticleWithAgents,
  type ArticleDraft,
  type CoordinatorResult,
} from "@/utils/ai-coordinator";
import { resolveCoverByStrategy } from "@/utils/image-agent";
import {
  GEMINI_BUSY_USER_MESSAGE,
  isGeminiBusyError,
  logGeminiBusy,
} from "@/lib/bot/gemini-client";
import { synthesizeFromTopic, type SynthesizedArticle } from "@/lib/bot/synthesizer";
import { stripArticleContentForPersist } from "@/lib/bot/strip-article-content";
import {
  AI_TIMEOUT_DEFER_LOG,
  isAiTimeoutOrStallError,
  logAiTimeoutDefer,
  runWithCronAiBudget,
} from "@/lib/bot/cron-graceful";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CONTENT_GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

type ContentSource = "local" | "whois" | "daily";

type EngineDraft = {
  source: ContentSource;
  categorySlug: string;
  contentType: "news" | "evergreen";
  userPrompt: string;
  fallbackTitle: string;
  isBreaking?: boolean;
};

type PersistedArticle = {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  source: ContentSource;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

/** Cron başına tek il — dönen slot ile rotasyon */
function provinceForTonight(): TurkiyeIl {
  const epochDay = Math.floor(Date.now() / 86_400_000);
  return TURKIYE_ILLER[epochDay % TURKIYE_ILLER.length];
}

/** Her cron tetiklemesinde yalnızca 1 içerik taslağı */
async function pickSingleDraftForCron(): Promise<EngineDraft | null> {
  const dateLabel = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const slot = Math.floor(Date.now() / 86_400_000) % 3;

  if (slot === 0) {
    const daily = await generateDailyNews();
    return daily[0] ?? null;
  }

  const il = provinceForTonight();
  return {
    source: "local",
    categorySlug: il.slug,
    contentType: "evergreen",
    fallbackTitle: `${il.name} için bugün gezilecek yerler ve hava durumu`,
    userPrompt: [
      `Konu: ${il.name} ili yerel gezi ve yaşam rehberi.`,
      `Tarih: ${dateLabel}.`,
      `Kapsam: gezilecek yerler, ulaşım, yeme-içme, hava durumu.`,
      `Anahtar kelime odak: ${il.name} gezi rehberi.`,
      "Ton: bilgilendirici, tarafsız.",
    ].join("\n"),
  };
}

async function generateDailyNews(): Promise<EngineDraft[]> {
  const dateLabel = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return [
    {
      source: "daily",
      categorySlug: "gundem",
      contentType: "news",
      fallbackTitle: `Türkiye gündemi: ${dateLabel} öne çıkan başlıklar`,
      userPrompt: [
        `Konu: Türkiye gündemi — ${dateLabel}.`,
        "Kapsam: ekonomi, siyaset, güvenlik, dünya, spor özeti.",
        "En az 3 H2 ve 1 madde listesi (ul) zorunlu.",
        "Ton: ajans haber dili.",
      ].join("\n"),
    },
  ];
}

async function persistCoordinatedArticle(
  draft: EngineDraft,
  coordinated: CoordinatorResult,
  coverImageUrl: string,
  synthesized: SynthesizedArticle,
): Promise<PersistedArticle | null> {
  const supabase = createSupabaseAdminClient();
  const slug = `${slugifyTitle(coordinated.title)}-${todayKey()}-${draft.source}`;

  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", draft.categorySlug)
    .maybeSingle();

  if (catError || !category) {
    console.error(
      `[generate-articles] Kategori bulunamadı (${draft.categorySlug}):`,
      catError?.message,
    );
    return null;
  }

  const basePayload = {
    title: coordinated.title,
    slug,
    spot_metni: coordinated.spot || null,
    content: stripArticleContentForPersist(coordinated.content),
    kapak_gorseli: coverImageUrl,
    category_id: category.id,
    yazar: "TRNETHABER İçerik Motoru",
    okuma_sayisi: "0 okuma",
    is_breaking: draft.isBreaking ?? false,
    published_at: new Date().toISOString(),
    seo_keywords: synthesized.seo_keywords,
    meta_description: synthesized.meta_description,
  };

  const { data, error } = await supabase
    .from("articles")
    .insert(basePayload)
    .select("id, slug, title")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      console.warn(`[generate-articles] Slug çakışması, atlandı: ${slug}`);
      return null;
    }
    console.error("[generate-articles] Supabase insert:", error?.message);
    return null;
  }

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    categorySlug: draft.categorySlug,
    source: draft.source,
  };
}

async function runContentPipeline(draft: EngineDraft) {
  let synthesized: SynthesizedArticle;
  try {
    synthesized = await synthesizeFromTopic({
      userPrompt: draft.userPrompt,
      fallbackTitle: draft.fallbackTitle,
      categorySlug: draft.categorySlug,
      isBreaking: draft.isBreaking,
      sourceId: `${draft.source}-${todayKey()}`,
    });
  } catch (err) {
    if (isGeminiBusyError(err)) {
      logGeminiBusy(err);
      return {
        source: draft.source,
        categorySlug: draft.categorySlug,
        ok: true,
        skipped: true,
        reason: "gemini_busy",
        message: GEMINI_BUSY_USER_MESSAGE,
        saved: null as PersistedArticle | null,
      };
    }
    if (isAiTimeoutOrStallError(err)) {
      logAiTimeoutDefer("generate-articles");
      return {
        source: draft.source,
        categorySlug: draft.categorySlug,
        ok: true,
        skipped: true,
        reason: "ai_timeout",
        message: AI_TIMEOUT_DEFER_LOG,
        saved: null as PersistedArticle | null,
      };
    }
    return {
      source: draft.source,
      categorySlug: draft.categorySlug,
      ok: false,
      error: err instanceof Error ? err.message : "SEO Assembler üretimi başarısız",
      saved: null as PersistedArticle | null,
    };
  }

  const articleDraft: ArticleDraft = {
    title: synthesized.title,
    content: synthesized.content,
    spot: synthesized.spot_metni,
  };

  const coordinated = await processArticleWithAgents(articleDraft);

  if (!coordinated.ok || coordinated.content.trim().length === 0) {
    return {
      source: draft.source,
      categorySlug: draft.categorySlug,
      ok: false,
      error: "Koordinatör boş içerik döndü",
      coordinated,
      saved: null as PersistedArticle | null,
    };
  }

  const slugSeed = slugifyTitle(coordinated.title);
  const cover = await resolveCoverByStrategy(
    coordinated.imageStrategy.image_strategy,
    coordinated.imageStrategy.image_prompt,
    slugSeed,
  );

  const coverUrl = synthesized.kapak_gorseli || cover.url;

  let saved: PersistedArticle | null = null;
  try {
    saved = await persistCoordinatedArticle(
      draft,
      coordinated,
      coverUrl,
      synthesized,
    );
  } catch (err) {
    console.error("[generate-articles] persist hata:", err);
  }

  return {
    source: draft.source,
    categorySlug: draft.categorySlug,
    ok: Boolean(saved),
    engine: "seo-assembler",
    coordinated: {
      title: coordinated.title,
      usedFallback: coordinated.usedFallback,
      imageStrategy: coordinated.imageStrategy,
      cover: { url: coverUrl, source: cover.source },
      inlineImages: synthesized.content.match(/article-inline-image/g)?.length ?? 0,
    },
    saved,
  };
}

async function handleCron(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(cronUnauthorizedResponse(), { status: 401 });
  }

  const missing = getNewsBotEnvMissing();
  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Eksik ortam değişkenleri: ${missing.join(", ")}`,
      },
      { status: 500 },
    );
  }

  try {
    const draft = await pickSingleDraftForCron();

    if (!draft) {
      return NextResponse.json(
        {
          ok: false,
          error: "Üretim kuyruğu boş.",
          model: CONTENT_GEMINI_MODEL,
        },
        { status: 502 },
      );
    }

    const budget = await runWithCronAiBudget(() => runContentPipeline(draft));

    if (budget.status === "timeout") {
      logAiTimeoutDefer("generate-articles");
      return NextResponse.json(
        {
          ok: true,
          success: true,
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
          engine: "seo-assembler-v1",
          model: CONTENT_GEMINI_MODEL,
          processed: 1,
          saved: 0,
        },
        { status: 200 },
      );
    }

    const result = budget.value;
    const savedCount = result.saved ? 1 : 0;
    const geminiBusy =
      "skipped" in result && result.skipped && result.reason === "gemini_busy";
    const aiTimeout =
      "skipped" in result && result.skipped && result.reason === "ai_timeout";

    if ((geminiBusy || aiTimeout) && savedCount === 0) {
      return NextResponse.json(
        {
          ok: true,
          success: true,
          message:
            "message" in result && result.message
              ? result.message
              : GEMINI_BUSY_USER_MESSAGE,
          engine: "seo-assembler-v1",
          model: CONTENT_GEMINI_MODEL,
          processed: 1,
          saved: 0,
          result,
        },
        { status: 200 },
      );
    }

    if (savedCount > 0 && result.saved?.slug) {
      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath(`/haber/${result.saved.slug}`);
      revalidatePath(`/kategori/${result.saved.categorySlug}`);
    }

    return NextResponse.json(
      {
        ok: true,
        engine: "seo-assembler-v1",
        model: CONTENT_GEMINI_MODEL,
        processed: 1,
        saved: savedCount,
        result,
      },
      { status: savedCount > 0 ? 201 : 200 },
    );
  } catch (err) {
    if (isAiTimeoutOrStallError(err)) {
      logAiTimeoutDefer("generate-articles");
      return NextResponse.json(
        {
          ok: true,
          success: true,
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
          engine: "seo-assembler-v1",
        },
        { status: 200 },
      );
    }
    const message = err instanceof Error ? err.message : "İçerik motoru başarısız";
    console.error("[generate-articles]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
