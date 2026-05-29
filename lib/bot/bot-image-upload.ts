import { processNewsImageBuffer } from "@/lib/bot/image-process";
import { scheduleMediaLibraryTagging } from "@/lib/media/schedule-media-tagging";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  NEWS_IMAGES_BUCKET,
  type NewsImageFolder,
} from "@/lib/storage/news-images";

function buildBotImagePath(folder: NewsImageFolder, slugSeed: string): string {
  const stamp = Date.now();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${stamp}-${Math.random().toString(36).slice(2, 10)}`;
  const safe = slugSeed.replace(/[^\w-]+/g, "-").slice(0, 48) || "haber";
  return `${folder}/bot_${safe}_${stamp}_${id}.webp`;
}

/** İşlenmiş WebP buffer → news-images bucket */
export async function uploadProcessedBotImage(
  rawBuffer: Buffer,
  folder: NewsImageFolder,
  slugSeed: string,
): Promise<string | null> {
  try {
    const processed = await processNewsImageBuffer(rawBuffer);
    const path = buildBotImagePath(folder, slugSeed);
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase.storage.from(NEWS_IMAGES_BUCKET).upload(path, processed, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "31536000",
    });

    if (error) {
      console.warn("[bot-image-upload]", error.message);
      return null;
    }

    const { data } = supabase.storage.from(NEWS_IMAGES_BUCKET).getPublicUrl(path);
    const publicUrl = data.publicUrl?.trim() || null;
    if (publicUrl) {
      scheduleMediaLibraryTagging({ url: publicUrl, storage_path: path });
    }
    return publicUrl;
  } catch (err) {
    console.warn("[bot-image-upload]", err);
    return null;
  }
}
