-- Manşet vitrin kontrolü (admin panel + ana sayfa)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_manset BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_ust_manset BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS articles_is_manset_idx
  ON public.articles (published_at DESC)
  WHERE is_manset = true AND published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS articles_is_ust_manset_idx
  ON public.articles (published_at DESC)
  WHERE is_ust_manset = true AND published_at IS NOT NULL;

COMMENT ON COLUMN public.articles.is_manset IS
  'Ana sayfa üst manşet şeridi (TopHeadlineStrip). Admin panelden işaretlenir.';

COMMENT ON COLUMN public.articles.is_ust_manset IS
  'Ana sayfa büyük manşet karuseli (HomeHero). Admin panelden işaretlenir.';
