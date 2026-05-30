-- Magazin + Siyaset kategorileri (menü ve news-bot RSS)
INSERT INTO public.categories (slug, name) VALUES
  ('magazin', 'Magazin'),
  ('siyaset', 'Siyaset')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
