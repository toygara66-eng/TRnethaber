-- Haber botu kuyruk tablosu: fetch → pending → process → completed
CREATE TABLE IF NOT EXISTS public.news_bot_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'skipped', 'failed')),
  source TEXT NOT NULL CHECK (source IN ('rss', 'mock')),
  wire_payload JSONB NOT NULL,
  rss_meta JSONB,
  result_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS news_bot_queue_status_created_idx
  ON public.news_bot_queue (status, created_at);

COMMENT ON TABLE public.news_bot_queue IS 'TRNETHABER haber botu — RSS fetch ve AI process kuyruğu';
