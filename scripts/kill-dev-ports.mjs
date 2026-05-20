/**
 * Windows: 3000–3005 portlarındaki node süreçlerini sonlandırır.
 */
import { execSync } from "node:child_process";

const ports = [3000, 3001, 3002, 3003, 3004, 3005];

if (process.platform !== "win32") {
  console.log("kill-dev-ports: yalnızca Windows için; atlanıyor.");
  process.exit(0);
}

for (const port of ports) {
  try {
    const out = execSync(
      `netstat -ano | findstr :${port}`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] },
    );
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const m = line.trim().match(/\s+(\d+)\s*$/);
      if (m) pids.add(m[1]);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        console.log(`Port ${port}: PID ${pid} kapatıldı`);
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* port boş */
  }
}

console.log("Dev portları temizlendi.");
