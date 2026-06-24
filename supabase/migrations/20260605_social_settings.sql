-- Ana sayfa sosyal medya profilleri (site_settings key-value)
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
