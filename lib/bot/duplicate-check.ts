import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugifyTitle } from "@/lib/slug";
import type { RssPickMeta } from "@/lib/bot/rss-fetcher";
import type { AgencyWire } from "@/lib/bot/types";

export type DuplicateReason = "title" | "slug" | "url";

export class DuplicateArticleError extends Error {
  readonly reason: DuplicateReason;
  readonly wire: AgencyWire;
  readonly rss?: RssPickMeta;

  constructor(reason: DuplicateReason, wire: AgencyWire, rss?: RssPickMeta) {
    super(`Duplicate haber (${reason}): ${wire.rawTitle}`);
    this.name = "DuplicateArticleError";
    this.reason = reason;
    this.wire = wire;
    this.rss = rss;
  }
}

export async function assertNotDuplicateArticle(
  wire: AgencyWire,
  rss?: RssPickMeta,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const slug = slugifyTitle(wire.rawTitle);
  const title = wire.rawTitle.trim();

  const { data: bySlug } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (bySlug) throw new DuplicateArticleError("slug", wire, rss);

  const { data: byTitle } = await supabase
    .from("articles")
    .select("id")
    .eq("title", title)
    .maybeSingle();

  if (byTitle) throw new DuplicateArticleError("title", wire, rss);

  if (wire.sourceUrl?.trim()) {
    const { data: byUrl, error: urlError } = await supabase
      .from("articles")
      .select("id")
      .eq("source_url", wire.sourceUrl.trim())
      .maybeSingle();

    if (!urlError && byUrl) throw new DuplicateArticleError("url", wire, rss);
  }
}
