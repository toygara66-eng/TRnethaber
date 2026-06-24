-- site_settings yanlış şemadaysa (key/value yok) tabloyu düzeltir.
-- UYARI: Mevcut site_settings verisini siler.

DROP TABLE IF EXISTS public.site_settings CASCADE;

CREATE TABLE public.site_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (key, value) VALUES
  ('logo_square_url', ''),
  ('logo_rectangle_url', ''),
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

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;

CREATE POLICY site_settings_public_read
  ON public.site_settings
  FOR SELECT
  USING (true);

NOTIFY pgrst, 'reload schema';
