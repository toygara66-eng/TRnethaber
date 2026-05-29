import { MapPin, Trophy } from "lucide-react";
import { CommentAvatar } from "@/components/comments/CommentAvatar";
import type { PublicComment } from "@/lib/types/comment";

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

type Props = {
  comment: PublicComment;
};

export function CommentItem({ comment }: Props) {
  const name = comment.author_display_name?.trim() || "Üye";

  return (
    <li className="flex gap-3 border-b border-black/[0.06] py-5 last:border-0">
      <CommentAvatar name={name} avatarUrl={comment.author_avatar_url} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-trnet-text">{name}</span>
          {comment.author_city ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-trnet-surface px-2 py-0.5 text-[11px] font-medium text-trnet-text/55">
              <MapPin className="h-3 w-3 text-trnet-primary/80" aria-hidden />
              {comment.author_city}
            </span>
          ) : null}
          {comment.author_team ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-trnet-primary/8 px-2 py-0.5 text-[11px] font-medium text-trnet-primary">
              <Trophy className="h-3 w-3" aria-hidden />
              {comment.author_team}
            </span>
          ) : null}
          <time
            className="text-xs text-trnet-text/40"
            dateTime={comment.created_at}
          >
            {formatRelativeTime(comment.created_at)}
          </time>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-trnet-text/85">
          {comment.body}
        </p>
      </div>
    </li>
  );
}
