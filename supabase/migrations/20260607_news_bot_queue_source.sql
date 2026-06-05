-- Eksik source kolonu (kısmi tablolar için — kod wire_payload zarfında da saklar)
ALTER TABLE public.news_bot_queue
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'rss'
    CHECK (source IN ('rss', 'mock'));
