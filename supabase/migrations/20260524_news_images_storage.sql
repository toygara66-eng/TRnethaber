-- Admin kapak görselleri — public bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'news-images',
  'news-images',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Herkes okuyabilir (site kapakları)
DROP POLICY IF EXISTS "news_images_public_read" ON storage.objects;
CREATE POLICY "news_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'news-images');
