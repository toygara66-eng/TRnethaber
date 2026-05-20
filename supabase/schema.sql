-- =============================================================================
-- TRNETHABER — Faz 3: Supabase semantik veri ağı şeması
-- Supabase SQL Editor veya CLI ile tek seferde çalıştırın.
-- =============================================================================
--
-- ANAYASA (mock / bot üretimi için zorunlu metin kuralları):
--   1) Rakamlar noktasız, kelimeyle yazılır (örnek: 15 bin 350 — "15.350" veya "15,350" YASAK).
--   2) Yüzdeler % sembolü olmadan kelimeyle yazılır (örnek: yüzde 35 — "%35" YASAK).
--   3) Kurum adlarında kesme işareti ile ek ayrılmaz (örnek: İleri Gazetesi — "İleri'nin Gazetesi" YASAK).
--   4) Placeholder görseller: yüz olmasın, yazısız ver.
--   5) Uydurma uzman görüşü veya halüsinasyon veri eklenmez; yalnızca doğrulanmış kaynak.
--
-- okuma_sayisi sütunu TEXT tutulur; sayısal işlem yapılmaz, vitrin doğrudan metin basar.
--
-- Bu dosya tekrar çalıştırılabilir (idempotent). Kısmi kurulum sonrası hata aldıysanız
-- yeniden çalıştırmanız yeterlidir; "already exists" hataları oluşmaz.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- categories — haber kategorileri
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT categories_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

COMMENT ON TABLE public.categories IS 'Haber kategorileri (Gündem, Ekonomi, Yerel vb.)';
COMMENT ON COLUMN public.categories.slug IS 'URL segmenti: gundem, ekonomi';
COMMENT ON COLUMN public.categories.name IS 'Görünen ad; kurum adı kuralına uygun yazılır';

-- -----------------------------------------------------------------------------
-- articles — otonom haber botu çıktıları
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  content         TEXT NOT NULL DEFAULT '',
  spot_metni      TEXT,
  kapak_gorseli   TEXT,
  category_id     UUID NOT NULL REFERENCES public.categories (id) ON DELETE RESTRICT,
  yazar           TEXT NOT NULL DEFAULT 'TRNETHABER Editör Masası',
  okuma_sayisi    TEXT NOT NULL DEFAULT '0 okuma',
  is_breaking     BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  source_url      TEXT,
  seo_keywords    TEXT,
  meta_description TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT articles_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT articles_okuma_sayisi_not_empty
    CHECK (char_length(trim(okuma_sayisi)) > 0)
);

COMMENT ON TABLE public.articles IS 'Yayınlanan haberler; botlar INSERT/UPDATE yapar';
COMMENT ON COLUMN public.articles.spot_metni IS 'Dek / özet paragraf';
COMMENT ON COLUMN public.articles.kapak_gorseli IS 'Kapak URL; görsel politikası: yüz yok, yazı yok';
COMMENT ON COLUMN public.articles.okuma_sayisi IS 'Anayasa: noktasız kelime formatı, örn. 15 bin 350 okuma';
COMMENT ON COLUMN public.articles.is_breaking IS 'true ise son dakika bandında öncelikli';
COMMENT ON COLUMN public.articles.yazar IS 'Kesme işareti olmadan kurum/yazar adı';
COMMENT ON COLUMN public.articles.source_url IS 'RSS kaynak URL — duplicate kontrolü';
COMMENT ON COLUMN public.articles.seo_keywords IS 'Virgülle ayrılmış SEO anahtar kelimeler';
COMMENT ON COLUMN public.articles.meta_description IS 'Google Discover / meta description';

CREATE UNIQUE INDEX IF NOT EXISTS articles_source_url_unique
  ON public.articles (source_url)
  WHERE source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS articles_category_id_idx ON public.articles (category_id);
CREATE INDEX IF NOT EXISTS articles_is_breaking_idx ON public.articles (is_breaking) WHERE is_breaking = true;
CREATE INDEX IF NOT EXISTS articles_published_at_idx ON public.articles (published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS articles_created_at_idx ON public.articles (created_at DESC);

-- -----------------------------------------------------------------------------
-- entities — Kimdir botu / varlık sayfaları (kişi, takım, kurum)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type AS t
    JOIN pg_namespace AS n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'entity_type'
  ) THEN
    CREATE TYPE public.entity_type AS ENUM ('kisi', 'takim', 'kurum');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.entities (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                          TEXT NOT NULL,
  slug                          TEXT NOT NULL UNIQUE,
  entity_type                   public.entity_type NOT NULL,
  bio_content                   TEXT NOT NULL DEFAULT '',
  image_url                     TEXT,
  anlik_durum_neden_gundemde    TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT entities_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

COMMENT ON TABLE public.entities IS 'Semantik varlık grafiği düğümleri (Kimdir botu)';
COMMENT ON COLUMN public.entities.entity_type IS 'kisi | takim | kurum';
COMMENT ON COLUMN public.entities.anlik_durum_neden_gundemde IS 'Gündemde olma gerekçesi; yüzde ve sayılar anayasa formatında';
COMMENT ON COLUMN public.entities.image_url IS 'Portre yerine soyut/kurumsal; yüz olmasın, yazısız ver';

CREATE INDEX IF NOT EXISTS entities_entity_type_idx ON public.entities (entity_type);
CREATE INDEX IF NOT EXISTS entities_name_idx ON public.entities (name);

-- -----------------------------------------------------------------------------
-- updated_at otomatik güncelleme
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS categories_set_updated_at ON public.categories;
CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS articles_set_updated_at ON public.articles;
CREATE TRIGGER articles_set_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS entities_set_updated_at ON public.entities;
CREATE TRIGGER entities_set_updated_at
  BEFORE UPDATE ON public.entities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

-- Herkese açık okuma (vitrin / Discover)
DROP POLICY IF EXISTS categories_select_public ON public.categories;
CREATE POLICY categories_select_public
  ON public.categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS articles_select_public ON public.articles;
CREATE POLICY articles_select_public
  ON public.articles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS entities_select_public ON public.entities;
CREATE POLICY entities_select_public
  ON public.entities FOR SELECT
  USING (true);

-- Yazma: yalnızca service_role (Dashboard → service_role key ile botlar)
-- Anon/authenticated istemciler INSERT/UPDATE/DELETE yapamaz.

-- -----------------------------------------------------------------------------
-- Örnek kategoriler (isteğe bağlı — SQL Editor'de çalıştırın)
-- Anayasa uyumlu mock metin örnekleri yorumda referans alınır.
-- -----------------------------------------------------------------------------
/*
INSERT INTO public.categories (slug, name) VALUES
  ('gundem', 'Gündem'),
  ('ekonomi', 'Ekonomi'),
  ('yerel', 'Yerel'),
  ('teknoloji', 'Teknoloji')
ON CONFLICT (slug) DO NOTHING;

-- Örnek haber (okuma_sayisi: 15 bin 350 okuma — noktasız)
-- İçerikte oran: yüzde 35 — % sembolü kullanılmaz
INSERT INTO public.articles (
  title, slug, spot_metni, content, kapak_gorseli,
  category_id, yazar, okuma_sayisi, is_breaking, published_at
)
SELECT
  'Meclis komisyonunda yeni düzenleme tasarısı ele alındı',
  'meclis-komisyonu-duzenleme-tasarisi',
  'Komisyon toplantısında tasarı metni madde madde görüşüldü.',
  'Analistler etkinin yaklaşık yüzde 35 civarında tartışıldığını belirtti.',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf',
  c.id,
  'TRNETHABER Editör Masası',
  '15 bin 350 okuma',
  false,
  now()
FROM public.categories c
WHERE c.slug = 'gundem'
ON CONFLICT (slug) DO NOTHING;

-- Örnek varlık (kurum adı: kesme işareti yok)
INSERT INTO public.entities (
  name, slug, entity_type, bio_content,
  anlik_durum_neden_gundemde
) VALUES (
  'Türkiye Cumhuriyet Merkez Bankası',
  'tcmb',
  'kurum',
  'Para politikası ve finansal istikrar alanında kurumsal yapı.',
  'Faiz kararı öncesi piyasalar temkinli; beklenti yüzde 2 virgül 5 bandında konuşuluyor.'
)
ON CONFLICT (slug) DO NOTHING;
*/
