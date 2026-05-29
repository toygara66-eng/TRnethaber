/**
 * TRNETHABER — Sosyal Medya Ajanı
 * Gemini ile post metni üretir, X (Twitter) üzerinden dağıtır.
 *
 * NOT: Supabase articles tablosuna is_shared_social BOOLEAN kolonu ekleyin:
 *   ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS is_shared_social BOOLEAN NOT NULL DEFAULT false;
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { TwitterApi } from "twitter-api-v2";
import { applyConstitutionRules } from "@/lib/constitution/text";
import { TWITTER_CHAR_LIMIT } from "@/lib/services/social/message";
import { absoluteUrl } from "@/lib/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SOCIAL_GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";

const SOCIAL_AGENT_SYSTEM = `Sen TRNETHABER Sosyal Medya Ajanısın.
Görev: Haber başlığı ve spot metninden X (Twitter) için tek bir paylaşım metni üret.

Kurallar:
- Tıklama tuzağı (clickbait) yok; merak uyandıran, güvenilir editoryal ton.
- 1-2 uygun emoji kullan (abartma).
- En fazla 3 ilgili hashtag (Türkçe, # ile).
- Haber linkini metnin sonuna ekle (verilen url).
- Toplam uzunluk 280 karakteri geçmesin.
- TRNETHABER anayasası: yüzde sembolü ve kesme işareti kullanma.
- Sadece JSON döndür: { "post_text": string }`;

export type SocialAgentResult = {
  ok: boolean;
  postText: string;
  postedToTwitter: boolean;
  twitterTweetId?: string;
  twitterError?: string;
  dbFlagUpdated: boolean;
  usedGeminiFallback: boolean;
};

type GeminiSocialResponse = {
  post_text?: string;
};

function hasTwitterEnv(): boolean {
  return Boolean(
    process.env.TWITTER_API_KEY?.trim() &&
      process.env.TWITTER_API_SECRET?.trim() &&
      process.env.TWITTER_ACCESS_TOKEN?.trim() &&
      process.env.TWITTER_ACCESS_SECRET?.trim(),
  );
}

function hasGeminiEnv(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function categoryHashtags(category: string): string[] {
  const slug = category.trim().toLowerCase();
  const map: Record<string, string[]> = {
    gundem: ["#Gündem", "#Türkiye"],
    ekonomi: ["#Ekonomi", "#Piyasa"],
    spor: ["#Spor", "#SüperLig"],
    dunya: ["#Dünya", "#Diplomasi"],
    teknoloji: ["#Teknoloji", "#Dijital"],
    saglik: ["#Sağlık", "#Yaşam"],
    "kultur-sanat": ["#Kültür", "#Sanat"],
    asayis: ["#Asayiş", "#Güvenlik"],
    otomobil: ["#Otomobil", "#Oto"],
  };

  const tags = map[slug] ?? ["#Haber", "#Gündem"];
  return tags.slice(0, 2);
}

function truncateTweet(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= TWITTER_CHAR_LIMIT) return normalized;
  if (TWITTER_CHAR_LIMIT <= 1) return "…";
  return `${normalized.slice(0, TWITTER_CHAR_LIMIT - 1).trimEnd()}…`;
}

function buildFallbackPostText(
  title: string,
  spot: string,
  slug: string,
  category: string,
): string {
  const url = absoluteUrl(`/haber/${slug}`);
  const tags = [...categoryHashtags(category), "#TRNETHABER"].slice(0, 3).join(" ");
  const lead = spot.trim() || title.trim();
  const raw = `🚨 Yeni gelişme: ${lead} Detaylar haberimizde! ${url} ${tags}`;
  return truncateTweet(applyConstitutionRules(raw));
}

async function generateSocialPostWithGemini(
  title: string,
  spot: string,
  slug: string,
  category: string,
): Promise<{ text: string; usedFallback: boolean }> {
  const url = absoluteUrl(`/haber/${slug}`);
  const fallback = buildFallbackPostText(title, spot, slug, category);

  if (!hasGeminiEnv()) {
    console.warn("[social-agent] GEMINI_API_KEY eksik — şablon metin kullanılıyor");
    return { text: fallback, usedFallback: true };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!.trim());
    const model = genAI.getGenerativeModel({
      model: SOCIAL_GEMINI_MODEL,
      systemInstruction: SOCIAL_AGENT_SYSTEM,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.55,
      },
    });

    const userPrompt = JSON.stringify({
      title: applyConstitutionRules(title),
      spot: applyConstitutionRules(spot),
      category,
      url,
      suggested_hashtags: categoryHashtags(category),
      max_length: TWITTER_CHAR_LIMIT,
    });

    const result = await model.generateContent(userPrompt);
    const raw = result.response.text()?.trim();
    if (!raw) {
      return { text: fallback, usedFallback: true };
    }

    let parsed: GeminiSocialResponse;
    try {
      parsed = JSON.parse(raw) as GeminiSocialResponse;
    } catch {
      return { text: fallback, usedFallback: true };
    }

    const postText = typeof parsed.post_text === "string" ? parsed.post_text.trim() : "";
    if (!postText) {
      return { text: fallback, usedFallback: true };
    }

    let text = applyConstitutionRules(postText);
    if (!text.includes(url)) {
      text = `${text} ${url}`;
    }
    return { text: truncateTweet(text), usedFallback: false };
  } catch (err) {
    console.warn("[social-agent] Gemini post üretimi başarısız:", err);
    return { text: fallback, usedFallback: true };
  }
}

async function postToTwitter(text: string): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}> {
  if (!hasTwitterEnv()) {
    return { ok: false, skipped: true, error: "Twitter API ortam değişkenleri eksik" };
  }

  try {
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!.trim(),
      appSecret: process.env.TWITTER_API_SECRET!.trim(),
      accessToken: process.env.TWITTER_ACCESS_TOKEN!.trim(),
      accessSecret: process.env.TWITTER_ACCESS_SECRET!.trim(),
    });

    const { data } = await client.v2.tweet(truncateTweet(text));
    return { ok: true, id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Twitter gönderimi başarısız";
    return { ok: false, error: message };
  }
}

async function markArticleSharedSocial(articleId: string): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("articles")
      .update({ is_shared_social: true } as unknown as never)
      .eq("id", articleId);

    if (error) {
      if (
        error.message?.includes("is_shared_social") ||
        error.code === "42703"
      ) {
        console.warn(
          "[social-agent] is_shared_social kolonu bulunamadı. Supabase SQL: ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS is_shared_social BOOLEAN NOT NULL DEFAULT false;",
        );
        return false;
      }
      console.error("[social-agent] Supabase güncelleme:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[social-agent] markArticleSharedSocial:", err);
    return false;
  }
}

/**
 * Sosyal medya post metnini üretir, X'e paylaşmayı dener, articles.is_shared_social günceller.
 * Fail-safe: hiçbir hata üst kata fırlatılmaz.
 */
export async function prepareAndPostSocialMedia(
  articleId: string,
  title: string,
  spot: string,
  slug: string,
  category: string,
): Promise<SocialAgentResult> {
  const safeTitle = applyConstitutionRules(title);
  const safeSpot = applyConstitutionRules(spot);

  const { text: postText, usedFallback: usedGeminiFallback } =
    await generateSocialPostWithGemini(safeTitle, safeSpot, slug, category);

  let postedToTwitter = false;
  let twitterTweetId: string | undefined;
  let twitterError: string | undefined;

  const twitter = await postToTwitter(postText);

  if (twitter.ok && twitter.id) {
    postedToTwitter = true;
    twitterTweetId = twitter.id;
    console.log("[social-agent] X paylaşımı başarılı:", twitter.id);
  } else {
    twitterError = twitter.error ?? "Twitter paylaşımı yapılamadı";
    console.log("[social-agent] Üretilen post metni (paylaşım yapılmadı veya atlandı):");
    console.log(postText);
    if (twitter.skipped) {
      console.warn("[social-agent] Twitter atlandı:", twitterError);
    } else {
      console.error("[social-agent] Twitter hata:", twitterError);
    }
  }

  const dbFlagUpdated = await markArticleSharedSocial(articleId);

  return {
    ok: true,
    postText,
    postedToTwitter,
    twitterTweetId,
    twitterError,
    dbFlagUpdated,
    usedGeminiFallback,
  };
}
