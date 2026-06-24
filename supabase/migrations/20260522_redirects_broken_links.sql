-- 404 günlüğü + 301 yönlendirme (idempotent)

CREATE TABLE IF NOT EXISTS public.broken_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url              TEXT NOT NULL UNIQUE,
  hit_count        INTEGER NOT NULL DEFAULT 1 CHECK (hit_count >= 0),
  last_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS broken_links_hit_count_idx
  ON public.broken_links (hit_count DESC);

CREATE TABLE IF NOT EXISTS public.redirects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_url    TEXT NOT NULL UNIQUE,
  to_url      TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS redirects_from_url_active_idx
  ON public.redirects (from_url)
  WHERE is_active = true;

ALTER TABLE public.broken_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS broken_links_public_insert ON public.broken_links;
CREATE POLICY broken_links_public_insert ON public.broken_links
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS broken_links_public_update ON public.broken_links;
CREATE POLICY broken_links_public_update ON public.broken_links
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS broken_links_public_select ON public.broken_links;
CREATE POLICY broken_links_public_select ON public.broken_links
  FOR SELECT USING (true);

DROP POLICY IF EXISTS redirects_public_select ON public.redirects;
CREATE POLICY redirects_public_select ON public.redirects
  FOR SELECT USING (is_active = true);

-- PostgREST şema önbelleğini yenile (tablo hemen görünsün)
NOTIFY pgrst, 'reload schema';
