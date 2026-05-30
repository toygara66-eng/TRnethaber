-- Şehir Rehberi Bot — seyahat kategorisi
INSERT INTO public.categories (slug, name) VALUES
  ('seyahat', 'Seyahat')
ON CONFLICT (slug) DO NOTHING;
