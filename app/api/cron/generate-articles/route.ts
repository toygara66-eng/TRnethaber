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
import { synthesizeFromTopic, type SynthesizedArticle } from "@/lib/bot/synthesizer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

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

const LOCAL_BATCH_SIZE = Math.min(
  81,
  Math.max(1, Number(process.env.CONTENT_ENGINE_LOCAL_BATCH ?? 12) || 12),
);

function todayKey(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function provincesForTonight(): TurkiyeIl[] {
  const epochDay = Math.floor(Date.now() / 86_400_000);
  const start = epochDay % TURKIYE_ILLER.length;
  const batch: TurkiyeIl[] = [];
  for (let i = 0; i < LOCAL_BATCH_SIZE; i++) {
    batch.push(TURKIYE_ILLER[(start + i) % TURKIYE_ILLER.length]);
  }
  return batch;
}

async function generateLocalNews(): Promise<EngineDraft[]> {
  const dateLabel = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const drafts: EngineDraft[] = [];

  for (const il of provincesForTonight()) {
    drafts.push({
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
    });
  }

  return drafts;
}

async function generateWhoIs(): Promise<EngineDraft[]> {
  const trendingName =
    process.env.CONTENT_ENGINE_TREND_NAME?.trim() || "Recep Tayyip Erdoğan";

  return [
    {
      source: "whois",
      categorySlug: "gundem",
      contentType: "evergreen",
      fallbackTitle: `${trendingName} kimdir, nerelidir?`,
      userPrompt: [
        `Konu: ${trendingName} kimdir, nerelidir, neden gündemde?`,
        `Anahtar kelime: ${trendingName} kimdir.`,
        "Bölümler: kimdir, kariyer, nereli, gündem nedeni.",
        "Ton: nötr ansiklopedik.",
      ].join("\n"),
    },
  ];
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
    content: coordinated.content,
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
    const localDrafts = await generateLocalNews();
    const [whoisDrafts, dailyDrafts] = await Promise.all([
      generateWhoIs(),
      generateDailyNews(),
    ]);

    const queue: EngineDraft[] = [...localDrafts, ...whoisDrafts, ...dailyDrafts];

    if (queue.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Üretim kuyruğu boş.",
          model: CONTENT_GEMINI_MODEL,
        },
        { status: 502 },
      );
    }

    const results = [];
    for (const draft of queue) {
      results.push(await runContentPipeline(draft));
    }

    const savedCount = results.filter((r) => r.saved).length;
    if (savedCount > 0) {
      revalidatePath("/");
      revalidatePath("/admin");
      for (const row of results) {
        if (row.saved?.slug) {
          revalidatePath(`/haber/${row.saved.slug}`);
          revalidatePath(`/kategori/${row.saved.categorySlug}`);
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        engine: "seo-assembler-v1",
        model: CONTENT_GEMINI_MODEL,
        localBatchSize: LOCAL_BATCH_SIZE,
        processed: queue.length,
        saved: savedCount,
        results,
      },
      { status: savedCount > 0 ? 201 : 200 },
    );
  } catch (err) {
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
