-- Kimdir bot: işlenmiş kişi kayıtları (mükerrer üretimi önler)
CREATE TABLE IF NOT EXISTS public.yazilmis_kisiler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name TEXT NOT NULL,
  normalized_key TEXT NOT NULL,
  trend_keyword TEXT,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS yazilmis_kisiler_normalized_key_uidx
  ON public.yazilmis_kisiler (normalized_key);

CREATE INDEX IF NOT EXISTS yazilmis_kisiler_created_at_idx
  ON public.yazilmis_kisiler (created_at DESC);

COMMENT ON TABLE public.yazilmis_kisiler IS 'Kimdir botunun daha önce işlediği kişiler; trend/LLM öncesi kontrol';
