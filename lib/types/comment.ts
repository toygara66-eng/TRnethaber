export type CommentStatus = "pending" | "approved" | "rejected";

export type PublicComment = {
  id: string;
  article_id: string;
  user_id: string;
  body: string;
  status: CommentStatus;
  author_display_name: string | null;
  author_city: string | null;
  author_team: string | null;
  author_avatar_url: string | null;
  created_at: string;
};
