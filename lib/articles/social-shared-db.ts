import { parseSocialShared, type SocialSharedMap } from "@/lib/articles/social-shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Bot / cron: başarılı paylaşım sonrası social_shared güncelle */
export async function patchArticleSocialShared(
  articleId: string,
  patch: Partial<SocialSharedMap>,
): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("articles")
      .select("social_shared")
      .eq("id", articleId)
      .maybeSingle();

    if (error) {
      if (error.message?.includes("social_shared")) return;
      console.warn("[social_shared] okuma:", error.message);
      return;
    }

    const current = parseSocialShared(data?.social_shared);
    const next: SocialSharedMap = { ...current, ...patch };

    const { error: updateError } = await supabase
      .from("articles")
      .update({ social_shared: next })
      .eq("id", articleId);

    if (updateError) {
      console.warn("[social_shared] güncelleme:", updateError.message);
    }
  } catch (err) {
    console.warn("[social_shared] patch:", err);
  }
}

export function platformsFromShareResult(result: {
  telegram: { ok: boolean };
  twitter: { ok: boolean };
}): Partial<SocialSharedMap> {
  const patch: Partial<SocialSharedMap> = {};
  if (result.twitter.ok) patch.twitter = true;
  if (result.telegram.ok) patch.telegram = true;
  return patch;
}
