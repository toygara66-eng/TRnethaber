/**
 * Supabase bağlantı testi: node scripts/check-supabase.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dns from "node:dns/promises";

const root = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(root, "..", ".env.local");

if (!fs.existsSync(envPath)) {
  console.error("HATA: .env.local bulunamadı.");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  env.SUPABASE_PUBLISHABLE_KEY ??
  env.SUPABASE_ANON_KEY ??
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "HATA: SUPABASE_URL veya SUPABASE_PUBLISHABLE_KEY eksik (.env.local).",
  );
  process.exit(1);
}

let hostname;
try {
  hostname = new URL(url).hostname;
} catch {
  console.error("HATA: Geçersiz URL:", url);
  process.exit(1);
}

console.log("Proje URL:", url);
console.log("Anahtar:", key.slice(0, 12) + "…");

try {
  const resolved = await dns.lookup(hostname);
  console.log("DNS OK:", hostname, "→", resolved.address);
} catch (e) {
  console.error("\nDNS HATASI:", hostname, "çözümlenemedi.");
  console.error("Bu alan adı Supabase'de yok veya proje silinmiş / URL yanlış kopyalanmış.");
  console.error("\nÇözüm:");
  console.error("1. https://supabase.com/dashboard → projenizi açın");
  console.error("2. Settings → API → Project URL değerini AYNEN .env.local dosyasına yapıştırın");
  console.error("3. Proje Paused ise Restore project yapın");
  process.exit(1);
}

const res = await fetch(`${url}/rest/v1/categories?select=slug&limit=1`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
});

console.log("REST API:", res.status, res.statusText);

if (res.ok) {
  const data = await res.json();
  console.log("Bağlantı başarılı. Örnek kategori:", data);
} else {
  const body = await res.text();
  console.error("API yanıtı:", body.slice(0, 300));
  process.exit(1);
}

const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.warn("\nUYARI: SUPABASE_SERVICE_ROLE_KEY tanımlı değil.");
  console.warn("Admin panelde haber eklemek için .env.local dosyasına ekleyin:");
  console.warn("  Dashboard → Settings → API → service_role (veya secret) key");
  console.warn("  npm run dev yeniden başlatın.");
} else {
  console.log("\nService role: tanımlı (" + serviceKey.slice(0, 8) + "…)");
  const probe = await fetch(`${url}/rest/v1/articles?select=id&limit=1`, {
    method: "HEAD",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  console.log("Service role API:", probe.status, probe.statusText);
}
