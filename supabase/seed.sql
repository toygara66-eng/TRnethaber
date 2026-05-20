-- =============================================================================
-- TRNETHABER — Faz 4 test verisi (seed)
-- schema.sql çalıştırıldıktan sonra SQL Editor'de bir kez çalıştırın.
-- Tekrar çalıştırılabilir: slug çakışmalarında ON CONFLICT DO NOTHING.
--
-- ANAYASA: rakamlar noktasız (15 bin 350), yüzdeler kelimeyle (yüzde 35),
-- kurum adlarında kesme işareti yok, görseller soyut/yüz yok/yazısız.
-- =============================================================================

INSERT INTO public.categories (slug, name) VALUES
  ('gundem', 'Gündem'),
  ('ekonomi', 'Ekonomi'),
  ('spor', 'Spor'),
  ('teknoloji', 'Teknoloji'),
  ('dunya', 'Dünya'),
  ('kultur-sanat', 'Kültür Sanat'),
  ('saglik-yasam', 'Sağlık Yaşam'),
  ('otomobil', 'Otomobil'),
  ('asayis', 'Asayiş'),
  ('yerel-haberler', 'Yerel Haberler')
ON CONFLICT (slug) DO NOTHING;

-- 81 il alt kategorisi: supabase/migrations/add-yerel-asayis-categories.sql

-- 1) Son dakika — ekonomi
INSERT INTO public.articles (
  title,
  slug,
  spot_metni,
  content,
  kapak_gorseli,
  category_id,
  yazar,
  okuma_sayisi,
  is_breaking,
  published_at
)
SELECT
  'Borsa İstanbul günü yüzde 1 virgül 2 yükselişle kapandı',
  'borsa-istanbul-gun-kapanis',
  'Piyasalar haftayı temkinli tamamladı; işlem hacmi 8 milyon lot bandında kaldı.',
  'Piyasa analistleri, sektör ağırlıklı tablonun yaklaşık yüzde 35 oranında pozitif ayrıştığını kaydetti. Türkiye Cumhuriyet Merkez Bankası veri takvimi yatırımcıların odağında kaldı.',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1920&q=80',
  c.id,
  'TRNETHABER Ekonomi',
  '15 bin 350 okuma',
  true,
  now() - interval '2 hours'
FROM public.categories AS c
WHERE c.slug = 'ekonomi'
ON CONFLICT (slug) DO NOTHING;

-- 2) Gündem
INSERT INTO public.articles (
  title,
  slug,
  spot_metni,
  content,
  kapak_gorseli,
  category_id,
  yazar,
  okuma_sayisi,
  is_breaking,
  published_at
)
SELECT
  'Meclis komisyonunda yeni düzenleme tasarısı ele alındı',
  'meclis-komisyonu-duzenleme-tasarisi',
  'Komisyon toplantısında tasarı metni madde madde görüşüldü.',
  'Uzmanlar düzenlemenin kamu maliyetine etkisinin yüzde 12 bandında tartışıldığını belirtti. İstanbul Büyükşehir Belediyesi sürece ilişkin ayrı bir bilgi notu sundu.',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1920&q=80',
  c.id,
  'TRNETHABER Gündem',
  '9 bin 200 okuma',
  false,
  now() - interval '5 hours'
FROM public.categories AS c
WHERE c.slug = 'gundem'
ON CONFLICT (slug) DO NOTHING;

-- 3) Ekonomi
INSERT INTO public.articles (
  title,
  slug,
  spot_metni,
  content,
  kapak_gorseli,
  category_id,
  yazar,
  okuma_sayisi,
  is_breaking,
  published_at
)
SELECT
  'Altın fiyatları haftalık bazda ons başına 40 dolar bandında hareket etti',
  'altin-fiyatlari-haftalik-bant',
  'Kıymetli metal piyasasında volatilite sınırlı seyretti.',
  'Raporlarda haftalık işlem hacminin 1 milyon 200 bin lot civarında kaldığı ve beklentinin yüzde 8 bandında fiyatlandığı ifade edildi.',
  'https://picsum.photos/seed/altin-fiyatlari/1920/1080.jpg',
  c.id,
  'TRNETHABER Ekonomi',
  '6 bin 800 okuma',
  false,
  now() - interval '8 hours'
FROM public.categories AS c
WHERE c.slug = 'ekonomi'
ON CONFLICT (slug) DO NOTHING;

-- 4) Spor
INSERT INTO public.articles (
  title,
  slug,
  spot_metni,
  content,
  kapak_gorseli,
  category_id,
  yazar,
  okuma_sayisi,
  is_breaking,
  published_at
)
SELECT
  'Süper Lig hafta sonu programı açıklandı',
  'super-lig-hafta-sonu-programi',
  'TFF resmi sitesinde 4 maçın saatleri yayımlandı.',
  'Kulüpler bilet satışlarında toplam 120 bin 500 bilet hedefini paylaştı. Tribün doluluk beklentisi yüzde 78 olarak konuşuluyor.',
  'https://picsum.photos/seed/super-lig/1920/1080.jpg',
  c.id,
  'TRNETHABER Spor',
  '4 bin 150 okuma',
  false,
  now() - interval '11 hours'
FROM public.categories AS c
WHERE c.slug = 'spor'
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Semantik varlıklar (Kimdir / entities)
-- -----------------------------------------------------------------------------
INSERT INTO public.entities (
  name,
  slug,
  entity_type,
  bio_content,
  image_url,
  anlik_durum_neden_gundemde
) VALUES
  (
    'Türkiye Cumhuriyet Merkez Bankası',
    'turkiye-cumhuriyet-merkez-bankasi',
    'kurum',
    'Para politikası ve finansal istikrar alanında kurumsal yapı. Politika faizi kararları piyasa odağında.',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1920&q=80',
    'Faiz kararı sonrası piyasalar temkinli; beklenti yüzde 50 bandında konuşuluyor.'
  ),
  (
    'Borsa İstanbul',
    'borsa-istanbul',
    'kurum',
    'Türkiye sermaye piyasalarının merkezi borsa yapısı. Endeks ve işlem hacmi verileri gündemde.',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1920&q=80',
    'Gün kapanışı ve hacim verileri yatırımcıların odağında.'
  ),
  (
    'İstanbul Büyükşehir Belediyesi',
    'istanbul-buyuksehir-belediyesi',
    'kurum',
    'İstanbul kent yönetimi ve altyapı yatırımları alanında faaliyet gösteren kurum.',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1920&q=80',
    'Meclis komisyonundaki düzenleme tasarısına ilişkin bilgi notu gündeme taşındı.'
  ),
  (
    'Süper Lig',
    'super-lig',
    'takim',
    'Türkiye profesyonel futbolunun en üst lig düzeyi. Haftalık maç programı ve bilet satışları izleniyor.',
    'https://picsum.photos/seed/super-lig/1920/1080.jpg',
    'Hafta sonu programı ve tribün doluluk beklentisi yüzde 78 bandında konuşuluyor.'
  )
ON CONFLICT (slug) DO NOTHING;
