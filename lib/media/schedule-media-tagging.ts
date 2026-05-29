import { analyzeMediaImageWithGemini } from "@/lib/media/analyze-media-image";
import {
  updateMediaLibraryMetadata,
  upsertMediaLibraryStub,
} from "@/lib/media/media-library-db";
import { runAfterResponse } from "@/lib/runtime/run-after-response";

export type MediaTaggingJob = {
  url: string;
  storage_path?: string | null;
};

/**
 * Upload yanıtını bekletmeden arka planda Gemini etiketleme.
 * Vercel'de waitUntil ile işlem lambda kapanmadan tamamlanır.
 */
export function scheduleMediaLibraryTagging(job: MediaTaggingJob): void {
  if (process.env.MEDIA_TAGGING_ENABLED === "false") return;

  runAfterResponse(async () => {
    try {
      await upsertMediaLibraryStub(job);
      const meta = await analyzeMediaImageWithGemini(job.url);
      await updateMediaLibraryMetadata(job.url, meta);
      console.info("[media-tagging] OK:", job.url.slice(0, 80));
    } catch (err) {
      console.warn("[media-tagging] failed:", job.url, err);
    }
  });
}
