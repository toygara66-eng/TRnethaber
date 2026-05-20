import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const targets = [
  path.join(process.cwd(), ".next"),
  path.join(process.cwd(), ".cache", "next"),
  path.join(os.tmpdir(), "trnethaber-next"),
];

const rmOpts = { recursive: true, force: true, maxRetries: 12, retryDelay: 400 };

for (const dir of targets) {
  if (!fs.existsSync(dir)) continue;
  try {
    fs.rmSync(dir, rmOpts);
    console.log(`Silindi: ${dir}`);
  } catch (err) {
    console.warn(`Uyarı: silinemedi (${dir}): ${err.message}`);
    console.warn("Tüm terminal/node süreçlerini kapatıp tekrar deneyin.");
  }
}

console.log("Önbellek temizlendi. npm run dev:clean ile yeniden başlatın.");
