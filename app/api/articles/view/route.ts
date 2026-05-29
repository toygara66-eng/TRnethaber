import { NextResponse } from "next/server";
import { isMissingIsPublishedColumn, isRowPublished } from "@/lib/articles/publish";
import {
  coerceViewCount,
  isMissingViewCountColumn,
} from "@/lib/articles/view-count-db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Body = {
  articleId?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek." }, { status: 400 });
  }

  const articleId = body.articleId?.trim();
  if (!articleId) {
    return NextResponse.json({ ok: false, error: "articleId gerekli." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    let rowRes = await supabase
      .from("articles")
      .select("id, view_count, published_at")
      .eq("id", articleId)
      .maybeSingle();

    if (rowRes.error?.message && isMissingViewCountColumn(rowRes.error.message)) {
      rowRes = await supabase
        .from("articles")
        .select("id, published_at")
        .eq("id", articleId)
        .maybeSingle();
    }

    if (rowRes.error?.message && isMissingIsPublishedColumn(rowRes.error.message)) {
      rowRes = await supabase
        .from("articles")
        .select("id, published_at")
        .eq("id", articleId)
        .maybeSingle();
    }

    if (rowRes.error) {
      return NextResponse.json({ ok: false, error: rowRes.error.message }, { status: 500 });
    }

    if (!rowRes.data || !isRowPublished(rowRes.data)) {
      return NextResponse.json({ ok: false, error: "Haber bulunamadı." }, { status: 404 });
    }

    const current = coerceViewCount(
      (rowRes.data as { view_count?: unknown }).view_count,
    );

    const { error: updateError } = await supabase
      .from("articles")
      .update({
        view_count: current + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", articleId);

    if (updateError) {
      if (isMissingViewCountColumn(updateError.message)) {
        return NextResponse.json({ ok: true, skipped: true });
      }
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sayaç güncellenemedi.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
