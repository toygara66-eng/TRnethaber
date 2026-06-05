-- Kısmi news_bot_queue tabloları: eksik temel kolonları ekle
ALTER TABLE public.news_bot_queue
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE public.news_bot_queue
  ADD COLUMN IF NOT EXISTS wire_payload JSONB;

ALTER TABLE public.news_bot_queue
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'rss';

ALTER TABLE public.news_bot_queue
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.news_bot_queue
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
