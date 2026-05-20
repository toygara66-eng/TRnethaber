-- Asayiş + Yerel Haberler + 81 il alt kategorisi
-- Supabase SQL Editor'de bir kez çalıştırın.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON public.categories (parent_id);

INSERT INTO public.categories (slug, name) VALUES
  ('asayis', 'Asayiş'),
  ('yerel-haberler', 'Yerel Haberler')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.categories (slug, name, parent_id)
SELECT v.slug, v.name, p.id
FROM (
VALUES
  ('yerel-adana', 'Adana'),
  ('yerel-adiyaman', 'Adıyaman'),
  ('yerel-afyonkarahisar', 'Afyonkarahisar'),
  ('yerel-agri', 'Ağrı'),
  ('yerel-amasya', 'Amasya'),
  ('yerel-ankara', 'Ankara'),
  ('yerel-antalya', 'Antalya'),
  ('yerel-artvin', 'Artvin'),
  ('yerel-aydin', 'Aydın'),
  ('yerel-balikesir', 'Balıkesir'),
  ('yerel-bilecik', 'Bilecik'),
  ('yerel-bingol', 'Bingöl'),
  ('yerel-bitlis', 'Bitlis'),
  ('yerel-bolu', 'Bolu'),
  ('yerel-burdur', 'Burdur'),
  ('yerel-bursa', 'Bursa'),
  ('yerel-canakkale', 'Çanakkale'),
  ('yerel-cankiri', 'Çankırı'),
  ('yerel-corum', 'Çorum'),
  ('yerel-denizli', 'Denizli'),
  ('yerel-diyarbakir', 'Diyarbakır'),
  ('yerel-edirne', 'Edirne'),
  ('yerel-elazig', 'Elazığ'),
  ('yerel-erzincan', 'Erzincan'),
  ('yerel-erzurum', 'Erzurum'),
  ('yerel-eskisehir', 'Eskişehir'),
  ('yerel-gaziantep', 'Gaziantep'),
  ('yerel-giresun', 'Giresun'),
  ('yerel-gumushane', 'Gümüşhane'),
  ('yerel-hakkari', 'Hakkari'),
  ('yerel-hatay', 'Hatay'),
  ('yerel-isparta', 'Isparta'),
  ('yerel-mersin', 'Mersin'),
  ('yerel-istanbul', 'İstanbul'),
  ('yerel-izmir', 'İzmir'),
  ('yerel-kars', 'Kars'),
  ('yerel-kastamonu', 'Kastamonu'),
  ('yerel-kayseri', 'Kayseri'),
  ('yerel-kirklareli', 'Kırklareli'),
  ('yerel-kirsehir', 'Kırşehir'),
  ('yerel-kocaeli', 'Kocaeli'),
  ('yerel-konya', 'Konya'),
  ('yerel-kutahya', 'Kütahya'),
  ('yerel-malatya', 'Malatya'),
  ('yerel-manisa', 'Manisa'),
  ('yerel-kahramanmaras', 'Kahramanmaraş'),
  ('yerel-mardin', 'Mardin'),
  ('yerel-mugla', 'Muğla'),
  ('yerel-mus', 'Muş'),
  ('yerel-nevsehir', 'Nevşehir'),
  ('yerel-nigde', 'Niğde'),
  ('yerel-ordu', 'Ordu'),
  ('yerel-rize', 'Rize'),
  ('yerel-sakarya', 'Sakarya'),
  ('yerel-samsun', 'Samsun'),
  ('yerel-siirt', 'Siirt'),
  ('yerel-sinop', 'Sinop'),
  ('yerel-sivas', 'Sivas'),
  ('yerel-tekirdag', 'Tekirdağ'),
  ('yerel-tokat', 'Tokat'),
  ('yerel-trabzon', 'Trabzon'),
  ('yerel-tunceli', 'Tunceli'),
  ('yerel-sanliurfa', 'Şanlıurfa'),
  ('yerel-usak', 'Uşak'),
  ('yerel-van', 'Van'),
  ('yerel-yozgat', 'Yozgat'),
  ('yerel-zonguldak', 'Zonguldak'),
  ('yerel-aksaray', 'Aksaray'),
  ('yerel-bayburt', 'Bayburt'),
  ('yerel-karaman', 'Karaman'),
  ('yerel-kirikkale', 'Kırıkkale'),
  ('yerel-batman', 'Batman'),
  ('yerel-sirnak', 'Şırnak'),
  ('yerel-bartin', 'Bartın'),
  ('yerel-ardahan', 'Ardahan'),
  ('yerel-igdir', 'Iğdır'),
  ('yerel-yalova', 'Yalova'),
  ('yerel-karabuk', 'Karabük'),
  ('yerel-kilis', 'Kilis'),
  ('yerel-osmaniye', 'Osmaniye'),
  ('yerel-duzce', 'Düzce')
) AS v(slug, name)
CROSS JOIN (SELECT id FROM public.categories WHERE slug = 'yerel-haberler') AS p
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  parent_id = EXCLUDED.parent_id;
