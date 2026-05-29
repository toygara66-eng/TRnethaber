"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CommentItem } from "@/components/comments/CommentItem";
import type { PublicComment } from "@/lib/types/comment";

type Props = {
  articleId: string;
};

export function ArticleCommentsSection({ articleId }: Props) {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "rejected" | "success";
    message: string;
  } | null>(null);

  const loadComments = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(
        `/api/comments?articleId=${encodeURIComponent(articleId)}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as {
        ok: boolean;
        comments?: PublicComment[];
      };
      if (json.ok && json.comments) {
        setComments(json.comments);
      }
    } catch {
      /* liste boş kalır */
    } finally {
      setLoadingList(false);
    }
  }, [articleId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;

    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setFeedback({ type: "error", message: "Yorum en az 2 karakter olmalıdır." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, text: trimmed }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        status?: string;
        message?: string;
        error?: string;
        comment?: PublicComment;
      };

      if (!res.ok || !json.ok) {
        setFeedback({
          type: "error",
          message: json.error ?? "Gönderilemedi",
        });
        return;
      }

      if (json.status === "rejected") {
        setFeedback({
          type: "rejected",
          message: json.message ?? "Yorumunuz topluluk kurallarımıza takıldı",
        });
        setText("");
        return;
      }

      if (json.comment) {
        setComments((prev) => {
          if (prev.some((c) => c.id === json.comment!.id)) return prev;
          return [json.comment!, ...prev];
        });
      }
      setText("");
      setFeedback({ type: "success", message: "Yorumunuz yayınlandı." });
      window.setTimeout(() => setFeedback(null), 4000);
    } catch {
      setFeedback({ type: "error", message: "Bağlantı hatası. Tekrar deneyin." });
    } finally {
      setSubmitting(false);
    }
  };

  const authRedirect = encodeURIComponent(pathname || "/");

  return (
    <section
      className="mt-10 border-t border-black/[0.08] pt-10"
      aria-labelledby={`comments-heading-${articleId}`}
    >
      <div className="mb-6 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-trnet-primary" aria-hidden />
        <h2
          id={`comments-heading-${articleId}`}
          className="font-display text-2xl font-semibold text-trnet-text"
        >
          Yorumlar
        </h2>
        {!loadingList ? (
          <span className="rounded-full bg-trnet-surface px-2.5 py-0.5 text-xs font-semibold text-trnet-text/50">
            {comments.length}
          </span>
        ) : null}
      </div>

      <div className="relative">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-black/[0.08] bg-trnet-card p-4 shadow-sm">
          <label className="sr-only" htmlFor={`comment-input-${articleId}`}>
            Yorumunuz
          </label>
          <textarea
            id={`comment-input-${articleId}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Düşüncelerinizi paylaşın…"
            rows={4}
            maxLength={2000}
            disabled={submitting}
            className="w-full resize-y rounded-xl border border-black/[0.08] bg-trnet-surface px-4 py-3 text-sm text-trnet-text placeholder:text-trnet-text/40 focus:border-trnet-primary focus:outline-none focus:ring-1 focus:ring-trnet-primary disabled:opacity-60"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-trnet-text/40">{text.length}/2000</span>
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-trnet-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-trnet-breaking disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  İnceleniyor…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden />
                  Gönder
                </>
              )}
            </button>
          </div>
        </form>

        {ready && !user ? (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-trnet-black/55 px-6 backdrop-blur-[2px]"
            aria-hidden={false}
          >
            <div className="max-w-sm text-center">
              <p className="text-sm font-medium leading-relaxed text-white">
                Yorum yapmak için üye olmanız gerekmektedir.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={`/login?redirect=${authRedirect}`}
                  className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Giriş Yap
                </Link>
                <Link
                  href={`/signup?redirect=${authRedirect}&reason=comment`}
                  className="rounded-full bg-trnet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-trnet-breaking"
                >
                  Kayıt Ol
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {feedback ? (
        <p
          className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : feedback.type === "rejected"
                ? "border border-trnet-breaking/25 bg-trnet-breaking/10 text-trnet-breaking"
                : "border border-amber-200 bg-amber-50 text-amber-900"
          }`}
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="mt-8">
        {loadingList ? (
          <ul className="space-y-0" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex gap-3 border-b border-black/[0.06] py-5">
                <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-neutral-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
                  <div className="h-4 max-w-[80%] animate-pulse rounded bg-neutral-100" />
                </div>
              </li>
            ))}
          </ul>
        ) : comments.length > 0 ? (
          <ul>
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-black/10 bg-trnet-surface/80 px-6 py-10 text-center text-sm text-trnet-text/50">
            Henüz yorum yok. İlk yorumu siz yapın.
          </p>
        )}
      </div>
    </section>
  );
}
