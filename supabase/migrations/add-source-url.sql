-- Mevcut projeler için: articles.source_url (duplicate kontrolü)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS source_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS articles_source_url_unique
  ON public.articles (source_url)
  WHERE source_url IS NOT NULL;
