-- Kurumsal logo ayarları (admin /admin/settings)
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

DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read"
  ON public.site_settings FOR SELECT
  USING (true);

COMMENT ON TABLE public.site_settings IS 'Kurumsal kimlik — logo URL anahtarları (logo_square_url, logo_rectangle_url)';
