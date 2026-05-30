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
  ('magazin', 'Magazin'),
  ('siyaset', 'Siyaset'),
  ('dunya', 'Dünya'),
  ('kultur-sanat', 'Kültür Sanat'),
  ('saglik-yasam', 'Sağlık Yaşam'),
  ('otomobil', 'Otomobil'),
  ('asayis', 'Asayiş'),
  ('yerel-haberler', 'Yerel Haberler'),
  ('kimdir', 'Kimdir'),
  ('seyahat', 'Seyahat')
ON CONFLICT (slug) DO NOTHING;

-- Asayiş + Yerel 81 il: add-yerel-asayis-categories.sql dosyasını da çalıştırın

-- Yerel haber il slug
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS city_slug TEXT;
CREATE INDEX IF NOT EXISTS articles_city_slug_idx ON public.articles (city_slug)
  WHERE city_slug IS NOT NULL;

-- Faz: Yayın kontrolü (is_published) — admin yayın/durdur
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

UPDATE public.articles
SET is_published = true
WHERE published_at IS NOT NULL
  AND (is_published IS NULL OR is_published = false);

-- Faz: site_settings (kurumsal logo)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Faz: Gerçek okunma sayacı (view_count)
-- Tam dosya: supabase/migrations/20260523_article_view_count.sql

-- Faz: Medya kütüphanesi (AI alt_text + tags)
-- Tam dosya: supabase/migrations/20260530_media_library.sql

-- Faz: Admin kapak görselleri (Supabase Storage bucket: news-images)
-- Tam dosya: supabase/migrations/20260524_news_images_storage.sql

-- Faz: RSS kaynak yönetimi (admin /admin/kaynaklar)
-- Tam dosya: supabase/migrations/20260525_rss_sources.sql

-- Faz: Manşet vitrin (is_manset, is_ust_manset)
-- Tam dosya: supabase/migrations/20260602_articles_manset_flags.sql
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
