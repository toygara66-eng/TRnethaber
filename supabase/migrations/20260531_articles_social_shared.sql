-- Sosyal medya dağıtım durumu (admin haber listesi)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS social_shared JSONB NOT NULL DEFAULT '{
    "twitter": false,
    "facebook": false,
    "instagram": false,
    "telegram": false
  }'::jsonb;

COMMENT ON COLUMN public.articles.social_shared IS 'Platform bazlı paylaşım: twitter, facebook, instagram, telegram';
