-- is_published + site_settings (idempotent)

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.articles.is_published IS 'false: vitrin/sitemap/404; true: yayında';

UPDATE public.articles
SET is_published = true
WHERE is_published IS NULL OR (is_published = false AND published_at IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.site_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (key, value)
VALUES
  ('logo_square_url', ''),
  ('logo_rectangle_url', '')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read ON public.site_settings
  FOR SELECT USING (true);
