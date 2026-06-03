-- Otonom manşet: importance_score + is_headline (ana) + is_top_headline (üst şerit)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS importance_score SMALLINT;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_headline BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_top_headline BOOLEAN NOT NULL DEFAULT false;

-- Eski sütunlardan taşıma (varsa)
UPDATE public.articles
SET is_headline = true
WHERE is_ust_manset = true AND is_headline = false;

UPDATE public.articles
SET is_top_headline = true
WHERE is_manset = true AND is_top_headline = false AND is_headline = false;

CREATE INDEX IF NOT EXISTS articles_is_headline_created_idx
  ON public.articles (created_at ASC)
  WHERE is_headline = true;

CREATE INDEX IF NOT EXISTS articles_is_top_headline_published_idx
  ON public.articles (published_at DESC)
  WHERE is_top_headline = true AND published_at IS NOT NULL;

COMMENT ON COLUMN public.articles.importance_score IS
  'Gemini 1-10 önem puanı; bot otonom manşet ataması için.';

COMMENT ON COLUMN public.articles.is_headline IS
  'Ana manşet (hero slider). Puan >= 8 veya admin. En fazla 10 slot.';

COMMENT ON COLUMN public.articles.is_top_headline IS
  'Üst manşet şeridi (4 kart). Puan 5-7 veya admin.';
