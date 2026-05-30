-- Yerel haberler: kısa il slug ile filtreleme (/kategori/yozgat vb.)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS city_slug TEXT;

CREATE INDEX IF NOT EXISTS articles_city_slug_idx ON public.articles (city_slug)
  WHERE city_slug IS NOT NULL;

COMMENT ON COLUMN public.articles.city_slug IS 'Yerel haber il slug (örn: yozgat); city sütunu ile birlikte kullanılır';
