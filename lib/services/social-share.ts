import { TwitterApi } from "twitter-api-v2";
import { buildTelegramMessage, buildTweetText } from "@/lib/services/social/message";
import type { SocialArticleInput } from "@/lib/services/social/message";

export type { SocialArticleInput };

export type SocialChannelResult =
  | { ok: true; id?: string }
  | { ok: false; skipped?: boolean; error: string };

export type SocialShareResult = {
  telegram: SocialChannelResult;
  twitter: SocialChannelResult;
};

function hasTelegramEnv(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim(),
  );
}

function hasTwitterEnv(): boolean {
  return Boolean(
    process.env.TWITTER_API_KEY?.trim() &&
      process.env.TWITTER_API_SECRET?.trim() &&
      process.env.TWITTER_ACCESS_TOKEN?.trim() &&
      process.env.TWITTER_ACCESS_SECRET?.trim(),
  );
}

async function postToTelegram(text: string): Promise<SocialChannelResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN!.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID!.trim();

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: false,
    }),
  });

  const body = (await res.json()) as { ok?: boolean; description?: string; result?: { message_id?: number } };

  if (!res.ok || !body.ok) {
    return {
      ok: false,
      error: body.description ?? `Telegram HTTP ${res.status}`,
    };
  }

  return { ok: true, id: body.result?.message_id?.toString() };
}

function isTwitterCreditsDepleted(err: unknown): boolean {
  const e = err as {
    message?: string;
    code?: number;
    data?: { title?: string; detail?: string };
  };
  const blob = [
    e?.message,
    e?.data?.title,
    e?.data?.detail,
    String(err),
  ]
    .filter(Boolean)
    .join(" ");
  return (
    e?.code === 402 ||
    e?.data?.title === "CreditsDepleted" ||
    /402|CreditsDepleted|credits to fulfill/i.test(blob)
  );
}

const TWITTER_CREDITS_MESSAGE =
  "Twitter API kredisi tükendi — X Developer portalından kredi ekleyin";

async function postToTwitter(text: string): Promise<SocialChannelResult> {
  try {
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!.trim(),
      appSecret: process.env.TWITTER_API_SECRET!.trim(),
      accessToken: process.env.TWITTER_ACCESS_TOKEN!.trim(),
      accessSecret: process.env.TWITTER_ACCESS_SECRET!.trim(),
    });

    const { data } = await client.v2.tweet(text);
    return { ok: true, id: data.id };
  } catch (err) {
    if (isTwitterCreditsDepleted(err)) {
      return { ok: false, skipped: true, error: TWITTER_CREDITS_MESSAGE };
    }
    const message = err instanceof Error ? err.message : "Twitter gönderimi başarısız";
    return { ok: false, error: message };
  }
}

/**
 * Yeni haberi Telegram kanalına ve X hesabına dağıtır.
 * Fail-safe: kanal hataları yutulur, çağıran işlem (DB kaydı) etkilenmez.
 */
export async function shareToSocialMedia(
  article: SocialArticleInput,
): Promise<SocialShareResult> {
  const result: SocialShareResult = {
    telegram: { ok: false, skipped: true, error: "Başlatılmadı" },
    twitter: { ok: false, skipped: true, error: "Başlatılmadı" },
  };

  if (hasTelegramEnv()) {
    try {
      const message = buildTelegramMessage(article);
      result.telegram = await postToTelegram(message);
      if (!result.telegram.ok) {
        console.error("[social-share] Telegram:", result.telegram.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Telegram gönderimi başarısız";
      result.telegram = { ok: false, error: message };
      console.error("[social-share] Telegram:", err);
    }
  } else {
    result.telegram = { ok: false, skipped: true, error: "TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID eksik" };
    console.warn("[social-share] Telegram atlandı (ortam değişkeni yok)");
  }

  if (hasTwitterEnv()) {
    try {
      const tweet = buildTweetText(article);
      result.twitter = await postToTwitter(tweet);
      if (!result.twitter.ok) {
        const credits = /402|CreditsDepleted|kredisi tükendi/i.test(result.twitter.error);
        const log = result.twitter.skipped || credits ? console.warn : console.error;
        log(
          "[social-share] Twitter:",
          credits ? TWITTER_CREDITS_MESSAGE : result.twitter.error,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Twitter gönderimi başarısız";
      result.twitter = { ok: false, error: message };
      console.error("[social-share] Twitter:", message);
    }
  } else {
    result.twitter = {
      ok: false,
      skipped: true,
      error: "Twitter API ortam değişkenleri eksik",
    };
    console.warn("[social-share] Twitter atlandı (ortam değişkeni yok)");
  }

  return result;
}
