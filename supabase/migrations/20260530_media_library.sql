-- Medya kütüphanesi — AI alt_text + tags ile arama

CREATE TABLE IF NOT EXISTS public.media_library (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url         TEXT NOT NULL UNIQUE,
  storage_path TEXT,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  alt_text    TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_library_created_at_idx
  ON public.media_library (created_at DESC);

CREATE INDEX IF NOT EXISTS media_library_tags_gin_idx
  ON public.media_library USING GIN (tags);

COMMENT ON TABLE public.media_library IS 'Supabase Storage görselleri — Gemini Vision alt_text ve tags';

-- Arama: alt_text, url ve tags dizisi içinde (case-insensitive)
CREATE OR REPLACE FUNCTION public.search_media_library(search_query TEXT)
RETURNS SETOF public.media_library
LANGUAGE sql
STABLE
AS $$
  SELECT m.*
  FROM public.media_library m
  WHERE
    coalesce(trim(search_query), '') = ''
    OR m.alt_text ILIKE '%' || search_query || '%'
    OR m.url ILIKE '%' || search_query || '%'
    OR EXISTS (
      SELECT 1 FROM unnest(m.tags) AS t(tag)
      WHERE tag ILIKE '%' || search_query || '%'
    )
  ORDER BY m.created_at DESC
  LIMIT 500;
$$;

ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_library_public_read ON public.media_library;
CREATE POLICY media_library_public_read
  ON public.media_library FOR SELECT
  USING (true);
