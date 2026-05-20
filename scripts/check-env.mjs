/**
 * Ortam değişkeni kontrolü: node scripts/check-env.mjs
 * .env.local dosyasını okur; Vercel deploy öncesi checklist.
 */
import fs from "node:fs";
import path from "node:path";

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

const checks = [
  { key: "SUPABASE_URL", required: true, test: (v) => v?.includes(".supabase.co") },
  { key: "SUPABASE_PUBLISHABLE_KEY", required: true },
  { key: "SUPABASE_SERVICE_ROLE_KEY", required: true, label: "bot + admin" },
  {
    key: "CRON_SECRET_KEY",
    required: false,
    alt: "CRON_SECRET",
    test: () => env.CRON_SECRET_KEY || env.CRON_SECRET,
  },
  { key: "GEMINI_API_KEY", required: true, label: "news-bot" },
  { key: "GEMINI_MODEL", required: false },
  { key: "TELEGRAM_BOT_TOKEN", required: false, label: "Faz 12 Telegram" },
  { key: "TELEGRAM_CHAT_ID", required: false, label: "Faz 12 Telegram" },
  { key: "TWITTER_API_KEY", required: false, label: "Faz 12 X" },
  { key: "TWITTER_API_SECRET", required: false, label: "Faz 12 X" },
  { key: "TWITTER_ACCESS_TOKEN", required: false, label: "Faz 12 X" },
  { key: "TWITTER_ACCESS_SECRET", required: false, label: "Faz 12 X" },
];

let ok = true;
console.log("TRNETHABER ortam kontrolü\n");

if (!fs.existsSync(envPath)) {
  console.warn(".env.local bulunamadı — yalnızca process.env kontrol ediliyor.\n");
}

for (const c of checks) {
  const value = c.test ? c.test(env[c.key]) : env[c.key] ?? env[c.alt];
  const pass = Boolean(value);
  if (c.required && !pass) ok = false;
  const tag = pass ? "OK" : c.required ? "EKSIK" : "—";
  const name = c.alt ? `${c.key} / ${c.alt}` : c.key;
  console.log(`  [${tag}] ${name}${c.label ? ` (${c.label})` : ""}`);
}

console.log(ok ? "\nTüm zorunlu değişkenler mevcut." : "\nEksik değişkenleri .env.local veya Vercel Dashboard'a ekleyin.");
process.exit(ok ? 0 : 1);
