import { waitUntil } from "@vercel/functions";

/**
 * Sunucu yanıtı döndükten sonra arka plan işi (Gemini etiketleme vb.).
 * Vercel'de waitUntil ile lambda kapanmadan tamamlanır.
 */
export function runAfterResponse(task: () => Promise<void>): void {
  const promise = task().catch((err) => {
    console.warn("[run-after-response]", err);
  });

  try {
    waitUntil(promise);
  } catch {
    if (typeof setImmediate === "function") {
      setImmediate(() => {
        void promise;
      });
    } else {
      void promise;
    }
  }
}
