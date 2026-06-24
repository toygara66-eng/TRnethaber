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

-- Faz: site_settings (kurumsal logo + sosyal medya)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (key, value) VALUES
  ('social_x_url', 'https://x.com/TRNETHABER'),
  ('social_x_handle', '@TRNETHABER'),
  ('social_facebook_url', 'https://www.facebook.com/TRNETHABER'),
  ('social_facebook_handle', 'TRNETHABER'),
  ('social_instagram_url', 'https://www.instagram.com/trnethaber'),
  ('social_instagram_handle', '@trnethaber'),
  ('social_telegram_url', 'https://t.me/trnethaber'),
  ('social_telegram_handle', '@trnethaber'),
  ('social_youtube_url', 'https://www.youtube.com/@TRNETHABER'),
  ('social_youtube_handle', '@TRNETHABER')
ON CONFLICT (key) DO NOTHING;

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

-- Faz: Sosyal paylaşım durumu (admin listesi)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS social_shared JSONB NOT NULL DEFAULT '{
    "twitter": false,
    "facebook": false,
    "instagram": false,
    "telegram": false
  }'::jsonb;

-- Faz: Otonom manşet (importance_score, is_headline, is_top_headline)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS importance_score SMALLINT;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_headline BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_top_headline BOOLEAN NOT NULL DEFAULT false;

-- Kimdir bot: işlenmiş kişiler
-- Tam dosya: supabase/migrations/20260604_yazilmis_kisiler.sql
CREATE TABLE IF NOT EXISTS public.yazilmis_kisiler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name TEXT NOT NULL,
  normalized_key TEXT NOT NULL,
  trend_keyword TEXT,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS yazilmis_kisiler_normalized_key_uidx
  ON public.yazilmis_kisiler (normalized_key);

-- Faz: 404 günlüğü + 301 yönlendirme (admin /admin/redirects)
-- Tam dosya: supabase/migrations/20260522_redirects_broken_links.sql
CREATE TABLE IF NOT EXISTS public.broken_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url              TEXT NOT NULL UNIQUE,
  hit_count        INTEGER NOT NULL DEFAULT 1 CHECK (hit_count >= 0),
  last_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.redirects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_url    TEXT NOT NULL UNIQUE,
  to_url      TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS redirects_public_select ON public.redirects;
CREATE POLICY redirects_public_select ON public.redirects
  FOR SELECT USING (is_active = true);

ALTER TABLE public.broken_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS broken_links_public_insert ON public.broken_links;
CREATE POLICY broken_links_public_insert ON public.broken_links
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS broken_links_public_update ON public.broken_links;
CREATE POLICY broken_links_public_update ON public.broken_links
  FOR UPDATE USING (true);
DROP POLICY IF EXISTS broken_links_public_select ON public.broken_links;
CREATE POLICY broken_links_public_select ON public.broken_links
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS redirects_from_url_active_idx
  ON public.redirects (from_url)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS broken_links_hit_count_idx
  ON public.broken_links (hit_count DESC);

NOTIFY pgrst, 'reload schema';
