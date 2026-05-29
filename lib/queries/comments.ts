import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseClient } from "@/lib/supabase";
import type { PublicComment } from "@/lib/types/comment";

const COMMENT_SELECT = `
  id,
  article_id,
  user_id,
  body,
  status,
  author_display_name,
  author_city,
  author_team,
  author_avatar_url,
  created_at
`;

export async function getApprovedCommentsForArticle(
  articleId: string,
): Promise<PublicComment[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("article_id", articleId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message?.includes("comments")) {
      return [];
    }
    console.error("[comments] fetch approved:", error.message);
    return [];
  }

  return (data ?? []) as PublicComment[];
}

export async function updateCommentStatus(
  commentId: string,
  status: "approved" | "rejected",
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("comments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function insertPendingComment(params: {
  articleId: string;
  userId: string;
  body: string;
  authorDisplayName: string | null;
  authorCity: string | null;
  authorTeam: string | null;
  authorAvatarUrl: string | null;
}): Promise<PublicComment> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({
      article_id: params.articleId,
      user_id: params.userId,
      body: params.body.trim(),
      status: "pending",
      author_display_name: params.authorDisplayName,
      author_city: params.authorCity,
      author_team: params.authorTeam,
      author_avatar_url: params.authorAvatarUrl,
    })
    .select(COMMENT_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Yorum kaydedilemedi");
  }

  return data as PublicComment;
}

export async function getCommentById(commentId: string): Promise<PublicComment | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("id", commentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PublicComment;
}
