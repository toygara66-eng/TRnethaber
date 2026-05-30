-- Kimdir bot — articles kategorisi
INSERT INTO public.categories (slug, name) VALUES
  ('kimdir', 'Kimdir')
ON CONFLICT (slug) DO NOTHING;
