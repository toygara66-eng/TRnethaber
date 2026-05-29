import { NextResponse } from "next/server";
import { moderateCommentBody } from "@/lib/comments/moderate";
import {
  getApprovedCommentsForArticle,
  insertPendingComment,
  updateCommentStatus,
} from "@/lib/queries/comments";
import { getProfileByUserId } from "@/lib/queries/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PublicComment } from "@/lib/types/comment";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId")?.trim();

  if (!articleId) {
    return NextResponse.json({ ok: false, error: "articleId gerekli" }, { status: 400 });
  }

  const comments = await getApprovedCommentsForArticle(articleId);
  return NextResponse.json({ ok: true, comments });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Oturum gerekli" }, { status: 401 });
  }

  let body: { articleId?: string; text?: string };
  try {
    body = (await request.json()) as { articleId?: string; text?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek" }, { status: 400 });
  }

  const articleId = body.articleId?.trim();
  const text = body.text?.trim() ?? "";

  if (!articleId) {
    return NextResponse.json({ ok: false, error: "Haber kimliği eksik" }, { status: 400 });
  }
  if (text.length < 2 || text.length > 2000) {
    return NextResponse.json(
      { ok: false, error: "Yorum 2–2000 karakter olmalıdır" },
      { status: 400 },
    );
  }

  const profile = await getProfileByUserId(user.id);
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const avatarFromMeta =
    typeof meta?.avatar_url === "string"
      ? meta.avatar_url
      : typeof meta?.picture === "string"
        ? meta.picture
        : null;

  let pending: PublicComment;
  try {
    pending = await insertPendingComment({
      articleId,
      userId: user.id,
      body: text,
      authorDisplayName:
        profile?.display_name ??
        (typeof meta?.full_name === "string" ? meta.full_name : null) ??
        user.email?.split("@")[0] ??
        "Üye",
      authorCity: profile?.city ?? null,
      authorTeam: profile?.favorite_team ?? null,
      authorAvatarUrl: avatarFromMeta,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kayıt başarısız";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const { approved } = await moderateCommentBody(text);
  const status = approved ? "approved" : "rejected";

  try {
    await updateCommentStatus(pending.id, status);
  } catch (err) {
    console.error("[comments] status update:", err);
    return NextResponse.json(
      { ok: false, error: "Moderasyon güncellenemedi" },
      { status: 500 },
    );
  }

  if (!approved) {
    return NextResponse.json({
      ok: true,
      status: "rejected",
      message: "Yorumunuz topluluk kurallarımıza takıldı",
    });
  }

  return NextResponse.json({
    ok: true,
    status: "approved",
    comment: { ...pending, status: "approved" as const },
  });
}
