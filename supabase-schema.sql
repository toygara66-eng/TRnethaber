-- =============================================================================
-- TRNETHABER — 19 Modüllük Otonom Medya Fabrikası (Ultra Agent Mimarisi)
-- Proje kökü: supabase-schema.sql
-- Supabase SQL Editor'de tek seferde çalıştırın (idempotent).
--
-- NOT: Mevcut supabase/schema.sql kurulumu varsa alttaki ALTER bölümü
-- articles.last_ai_update ve ghost_analytics ekler.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- users — ziyaretçi kayıt (il + takım tercihi)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  city        TEXT NOT NULL,
  team        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_email_format
    CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  CONSTRAINT users_city_not_empty
    CHECK (char_length(trim(city)) > 0),
  CONSTRAINT users_team_not_empty
    CHECK (char_length(trim(team)) > 0)
);

COMMENT ON TABLE public.users IS 'Kayıtlı ziyaretçiler; yerel haber ve takım kişiselleştirmesi';
COMMENT ON COLUMN public.users.city IS 'Kullanıcının ili (ör. İstanbul, Ankara)';
COMMENT ON COLUMN public.users.team IS 'Takım tercihi (ör. Galatasaray, Fenerbahçe)';

CREATE INDEX IF NOT EXISTS users_city_idx ON public.users (city);
CREATE INDEX IF NOT EXISTS users_team_idx ON public.users (team);

-- -----------------------------------------------------------------------------
-- articles — haber + evergreen rehber (15 günlük AI güncelleme çarkı)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'article_content_type'
  ) THEN
    CREATE TYPE public.article_content_type AS ENUM ('news', 'evergreen');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.articles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL,
  content           TEXT NOT NULL DEFAULT '',
  spot_metni        TEXT,
  category_slug     TEXT NOT NULL DEFAULT 'gundem',
  category_id       UUID REFERENCES public.categories (id) ON DELETE SET NULL,
  content_type      public.article_content_type NOT NULL DEFAULT 'news',
  kapak_gorseli     TEXT,
  yazar             TEXT NOT NULL DEFAULT 'TRNETHABER Editör Masası',
  okuma_sayisi      TEXT NOT NULL DEFAULT '0 okuma',
  is_breaking       BOOLEAN NOT NULL DEFAULT false,
  is_published      BOOLEAN NOT NULL DEFAULT false,
  published_at      TIMESTAMPTZ,
  source_url        TEXT,
  seo_keywords      TEXT,
  meta_description  TEXT,
  last_ai_update    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT articles_slug_unique UNIQUE (slug),
  CONSTRAINT articles_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT articles_category_slug_format
    CHECK (category_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT articles_okuma_sayisi_not_empty
    CHECK (char_length(trim(okuma_sayisi)) > 0)
);

COMMENT ON TABLE public.articles IS 'Haber ve evergreen rehber içerikleri';
COMMENT ON COLUMN public.articles.last_ai_update IS '15 günlük otomatik AI yenileme çarkı için son güncelleme zamanı';
COMMENT ON COLUMN public.articles.content_type IS 'news: güncel haber, evergreen: kalıcı rehber';
COMMENT ON COLUMN public.articles.category_slug IS 'URL/menü uyumlu kategori segmenti';

CREATE UNIQUE INDEX IF NOT EXISTS articles_source_url_unique
  ON public.articles (source_url)
  WHERE source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS articles_category_slug_idx ON public.articles (category_slug);
CREATE INDEX IF NOT EXISTS articles_content_type_idx ON public.articles (content_type);
CREATE INDEX IF NOT EXISTS articles_last_ai_update_idx ON public.articles (last_ai_update);
CREATE INDEX IF NOT EXISTS articles_published_at_idx ON public.articles (published_at DESC NULLS LAST);

-- -----------------------------------------------------------------------------
-- ghost_analytics — yalnızca admin: gerçek pageview (hayalet sayaç)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ghost_analytics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES public.articles (id) ON DELETE CASCADE,
  real_views  BIGINT NOT NULL DEFAULT 0 CHECK (real_views >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ghost_analytics_article_unique UNIQUE (article_id)
);

COMMENT ON TABLE public.ghost_analytics IS 'Admin paneli gerçek okuma sayıları; vitrin okuma_sayisi metninden bağımsız';
COMMENT ON COLUMN public.ghost_analytics.real_views IS 'Ham pageview toplamı (bot trafiği filtrelenmiş)';

CREATE INDEX IF NOT EXISTS ghost_analytics_real_views_idx
  ON public.ghost_analytics (real_views DESC);

-- -----------------------------------------------------------------------------
-- updated_at tetikleyicileri
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS articles_set_updated_at ON public.articles;
CREATE TRIGGER articles_set_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ghost_analytics_set_updated_at ON public.ghost_analytics;
CREATE TRIGGER ghost_analytics_set_updated_at
  BEFORE UPDATE ON public.ghost_analytics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Mevcut TRNETHABER kurulumu ile uyum (supabase/schema.sql sonrası)
-- -----------------------------------------------------------------------------
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS last_ai_update TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS category_slug TEXT;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS content_type public.article_content_type NOT NULL DEFAULT 'news';

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

-- -----------------------------------------------------------------------------
-- RLS (özet)
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghost_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own
  ON public.users FOR SELECT
  USING (auth.uid()::text = id::text OR auth.role() = 'service_role');

DROP POLICY IF EXISTS articles_select_public ON public.articles;
CREATE POLICY articles_select_public
  ON public.articles FOR SELECT
  USING (is_published = true OR auth.role() = 'service_role');

DROP POLICY IF EXISTS ghost_analytics_admin_only ON public.ghost_analytics;
CREATE POLICY ghost_analytics_admin_only
  ON public.ghost_analytics FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
