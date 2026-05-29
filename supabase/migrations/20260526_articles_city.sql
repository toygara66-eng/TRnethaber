-- Kişiselleştirilmiş şehir akışı (Sana Özel)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS city TEXT;

CREATE INDEX IF NOT EXISTS articles_city_idx ON public.articles (city)
  WHERE city IS NOT NULL;

COMMENT ON COLUMN public.articles.city IS 'Yerel haber şehri (örn: Yozgat); Sana Özel akışı';
