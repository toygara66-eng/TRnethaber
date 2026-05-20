-- Eski bot kayıtları: okuma_sayisi alanına yanlışlıkla "X dakika okuma" yazılmış.
-- Bu script görüntülenme metnini anayasa formatına çevirir (tek seferlik).

UPDATE public.articles
SET okuma_sayisi = '15 bin 350 okuma'
WHERE okuma_sayisi ~* 'dakika\s*okuma';
