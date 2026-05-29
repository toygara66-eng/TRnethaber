-- Gerçek okunma sayacı (yalnızca admin + en çok okunanlar sıralaması)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS view_count BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_view_count_nonneg;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_view_count_nonneg CHECK (view_count >= 0);

CREATE INDEX IF NOT EXISTS articles_view_count_desc_idx
  ON public.articles (view_count DESC)
  WHERE published_at IS NOT NULL;

COMMENT ON COLUMN public.articles.view_count IS
  'Gerçek sayfa görüntülenmesi; ön yüzde gösterilmez. Admin ve En Çok Okunanlar için.';

-- Eski metin okuma_sayisi değerlerinden rakam çıkarıp başlangıç skoru (isteğe bağlı)
UPDATE public.articles
SET view_count = GREATEST(
  view_count,
  COALESCE(NULLIF(regexp_replace(okuma_sayisi, '\D', '', 'g'), '')::bigint, 0)
)
WHERE view_count = 0
  AND okuma_sayisi IS NOT NULL
  AND regexp_replace(okuma_sayisi, '\D', '', 'g') <> '';
