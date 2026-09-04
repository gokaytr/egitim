-- ============================================================================
-- NOT: Bu migration dosyasi dokumantasyon/tekrarlanabilirlik amaciyla
-- repoya eklenmistir - asagidaki degisiklikler canli veritabaninda Supabase
-- MCP (apply_migration) ile bu SQL'in ayni icerigiyle ONCEDEN uygulanmistir.
-- ============================================================================

-- 1) Zorluk kademesi: kullanicinin "1 kolay, 2 orta, 3 zor, 4 olimpiyat"
--    talebiyle 4. kademe "cok_zor" -> "olimpiyat" olarak yeniden adlandirildi.
--    Zorluk hala SADECE admin/ogretmene gorunur, ogrenciye hicbir ekranda
--    gosterilmez (bkz. src/lib/questions/difficulty.ts).
alter type question_difficulty rename value 'cok_zor' to 'olimpiyat';

-- 2) Konu <-> sinav turu (exam_types) eslesmesindeki genis kapsamli hata
--    duzeltmesi: kullanicinin "bir soru hem AYT hem de 9. sinifta olmasin"
--    geri bildirimiyle bulundu. Bircok K-12 konusu, gercekte o sinif
--    seviyesinde test edilmeyen sinavlarla (ör. 1-7. sinif Turkce/Matematik
--    konulari KPSS/ALES/TYT ile, 9. sinif konulari LGS/AYT/YKS ile, 8. sinif
--    konulari TYT/KPSS/ALES ile) yanlislikla etiketlenmisti - bu, hem
--    "Sinif/Sinav" secicisinde bir konunun ait olmadigi bir sinav satirinin
--    altinda da gorunmesine hem de sinav bazli soru sayaclarinda CIFT SAYIMA
--    yol aciyordu. Bilerek DOKUNULMAYAN durumlar: 9-12. sinif Turkce/
--    Matematik konularina bu projede bilincli olarak eklenen 'DGS' etiketi
--    (TYT seviyesiyle ortusen icerik) ve 10-12. sinif arasindaki mevcut
--    TYT/AYT/YDT/YKS dagilimi (mufredat ile tutarli, hatali bulunmadi).

-- 1-7. sinif: sadece BILSEM kalsin.
update topics
set exam_types = coalesce(
  (select array_agg(e) from unnest(exam_types) as e where e = 'BILSEM'),
  '{}'::exam_target[]
)
where grade_level between 1 and 7
  and exam_types && array['LGS','TYT','AYT','YDT','YKS','KPSS','ALES','DGS','YDS','YOKDIL']::exam_target[];

-- 8. sinif: sadece LGS (ve varsa BILSEM) kalsin.
update topics
set exam_types = coalesce(
  (select array_agg(e) from unnest(exam_types) as e where e in ('LGS','BILSEM')),
  '{}'::exam_target[]
)
where grade_level = 8
  and exam_types && array['TYT','AYT','YDT','YKS','KPSS','ALES','DGS','YDS','YOKDIL']::exam_target[];

-- 9-12. sinif: LGS sadece 8. sinifi test eder.
update topics
set exam_types = array_remove(exam_types, 'LGS')
where grade_level between 9 and 12 and 'LGS' = any(exam_types);

-- 9. sinif: AYT/YDT/YKS gercekte 10-12. sinif icerigini test eder.
update topics
set exam_types = array_remove(array_remove(array_remove(exam_types, 'AYT'), 'YDT'), 'YKS')
where grade_level = 9 and exam_types && array['AYT','YDT','YKS']::exam_target[];

-- 9-12. sinif: KPSS/ALES/YDS/YOKDIL lise-sonrasi/kamu sinavlaridir, kendi
-- ayri (grade_level = NULL) konulari zaten var - lise konularindan
-- kaldirilsin (DGS'ye DOKUNULMUYOR, bilerek eklendi).
update topics
set exam_types = coalesce(
  (select array_agg(e) from unnest(exam_types) as e where e not in ('KPSS','ALES','YDS','YOKDIL')),
  '{}'::exam_target[]
)
where grade_level between 9 and 12
  and exam_types && array['KPSS','ALES','YDS','YOKDIL']::exam_target[];
