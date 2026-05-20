-- TRNETHABER — Bekleyen migration'ları tek seferde çalıştırın (Supabase SQL Editor)
-- Haber detay 404 ve bot duplicate/SEO için gerekli sütunlar

-- Faz 10: RSS duplicate
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS source_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS articles_source_url_unique
  ON public.articles (source_url)
  WHERE source_url IS NOT NULL;

-- Faz 11: SEO
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Faz 10: Ek kategoriler (RSS mega havuz)
INSERT INTO public.categories (slug, name) VALUES
  ('teknoloji', 'Teknoloji'),
  ('dunya', 'Dünya'),
  ('kultur-sanat', 'Kültür Sanat'),
  ('saglik-yasam', 'Sağlık Yaşam'),
  ('otomobil', 'Otomobil')
ON CONFLICT (slug) DO NOTHING;
