-- Haber yorumları + otonom moderasyon durumu
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) >= 2 AND char_length(body) <= 2000),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  author_display_name TEXT,
  author_city TEXT,
  author_team TEXT,
  author_avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comments_article_id_created_idx
  ON public.comments (article_id, created_at DESC);

CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments (user_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_approved" ON public.comments;
CREATE POLICY "comments_select_approved"
  ON public.comments FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "comments_select_own" ON public.comments;
CREATE POLICY "comments_select_own"
  ON public.comments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;
CREATE POLICY "comments_insert_own"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

COMMENT ON TABLE public.comments IS 'Haber yorumları — Gemini ile pending→approved/rejected';
