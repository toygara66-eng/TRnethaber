-- Faz 11: SEO / Google Discover alanları
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS meta_description TEXT;

COMMENT ON COLUMN public.articles.seo_keywords IS 'Virgülle ayrılmış odak anahtar kelimeler';
COMMENT ON COLUMN public.articles.meta_description IS 'Google meta description (~150 karakter)';
