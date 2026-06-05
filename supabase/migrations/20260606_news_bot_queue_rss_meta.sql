-- Eksik kolon yedeği (eski kısmi tablolar için)
ALTER TABLE public.news_bot_queue
  ADD COLUMN IF NOT EXISTS rss_meta JSONB;

ALTER TABLE public.news_bot_queue
  ADD COLUMN IF NOT EXISTS result_payload JSONB;

ALTER TABLE public.news_bot_queue
  ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE public.news_bot_queue
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
