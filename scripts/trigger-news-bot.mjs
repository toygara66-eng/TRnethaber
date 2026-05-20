/**
 * Yerel bot testi: node scripts/trigger-news-bot.mjs
 * Geliştirme sunucusu http://localhost:3000 adresinde çalışıyor olmalı.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, "..", ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const secret = env.CRON_SECRET_KEY;
const base = process.env.BOT_URL ?? "http://localhost:3000";

if (!secret) {
  console.error("CRON_SECRET_KEY .env.local içinde tanımlı değil.");
  process.exit(1);
}

const res = await fetch(`${base}/api/cron/news-bot`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  },
});

const body = await res.json();
console.log(res.status, body);
