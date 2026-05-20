/**
 * Sosyal medya ortam değişkenlerini doğrular (tweet göndermez).
 * node scripts/verify-social-env.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { TwitterApi } from "twitter-api-v2";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

const env = { ...process.env, ...loadEnv(envPath) };

let ok = true;

if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
  const res = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`,
  );
  const body = await res.json();
  if (body.ok) {
    console.log(`[OK] Telegram bot: @${body.result.username}`);
  } else {
    ok = false;
    console.log(`[HATA] Telegram: ${body.description}`);
  }
} else {
  console.log("[—] Telegram değişkenleri eksik");
}

if (
  env.TWITTER_API_KEY &&
  env.TWITTER_API_SECRET &&
  env.TWITTER_ACCESS_TOKEN &&
  env.TWITTER_ACCESS_SECRET
) {
  try {
    const client = new TwitterApi({
      appKey: env.TWITTER_API_KEY,
      appSecret: env.TWITTER_API_SECRET,
      accessToken: env.TWITTER_ACCESS_TOKEN,
      accessSecret: env.TWITTER_ACCESS_SECRET,
    });
    const me = await client.v2.me();
    console.log(`[OK] X hesabı: @${me.data.username} (${me.data.name})`);
  } catch (err) {
    ok = false;
    const msg = err?.data?.detail ?? err?.message ?? String(err);
    console.log(`[HATA] X: ${msg}`);
  }
} else {
  console.log("[—] Twitter değişkenleri eksik");
}

process.exit(ok ? 0 : 1);
