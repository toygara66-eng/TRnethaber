-- Admin: 81 il ve ulusal RSS kaynak yönetimi
CREATE TABLE IF NOT EXISTS public.rss_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  url           TEXT NOT NULL,
  city          TEXT,
  category      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rss_sources_url_unique ON public.rss_sources (url);

CREATE INDEX IF NOT EXISTS rss_sources_city_idx ON public.rss_sources (city);
CREATE INDEX IF NOT EXISTS rss_sources_is_active_idx ON public.rss_sources (is_active);

COMMENT ON TABLE public.rss_sources IS 'Admin panelinden yönetilen RSS/ajans kaynakları';
