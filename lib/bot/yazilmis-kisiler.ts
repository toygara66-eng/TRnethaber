import { normalizeTitleKey } from "@/lib/bot/title-similarity";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export function normalizePersonKey(name: string): string {
  return normalizeTitleKey(name);
}

function isMissingYazilmisTable(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("yazilmis_kisiler") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

let tableMissingLogged = false;

/**
 * Kişi daha önce kimdir botu tarafından işlendi mi?
 * Tablo yoksa false döner (articles duplicate kontrolü yedek kalır).
 */
export async function isYazilmisKisi(personOrKeyword: string): Promise<boolean> {
  const trimmed = personOrKeyword.trim();
  if (!trimmed) return false;

  const key = normalizePersonKey(trimmed);
  if (key.length < 3) return false;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("yazilmis_kisiler")
    .select("id")
    .eq("normalized_key", key)
    .maybeSingle();

  if (error) {
    if (isMissingYazilmisTable(error.message)) {
      if (!tableMissingLogged) {
        console.warn(
          "[yazilmis-kisiler] Tablo bulunamadı — supabase/migrations/20260604_yazilmis_kisiler.sql çalıştırın.",
        );
        tableMissingLogged = true;
      }
      return false;
    }
    console.warn("[yazilmis-kisiler] sorgu hatası:", error.message);
    return false;
  }

  return Boolean(data);
}

export async function registerYazilmisKisi(input: {
  personName: string;
  trendKeyword?: string;
  articleId?: string;
}): Promise<void> {
  const personName = input.personName.trim();
  if (!personName) return;

  const normalized_key = normalizePersonKey(personName);
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("yazilmis_kisiler").upsert(
    {
      person_name: personName,
      normalized_key,
      trend_keyword: input.trendKeyword?.trim() || null,
      article_id: input.articleId ?? null,
    },
    { onConflict: "normalized_key" },
  );

  if (error) {
    if (isMissingYazilmisTable(error.message)) {
      if (!tableMissingLogged) {
        console.warn("[yazilmis-kisiler] Kayıt atlandı — tablo yok.");
        tableMissingLogged = true;
      }
      return;
    }
    console.warn("[yazilmis-kisiler] kayıt hatası:", error.message);
  }
}
