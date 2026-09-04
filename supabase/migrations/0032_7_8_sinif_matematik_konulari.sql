-- ============================================================================
-- Kullanicinin "7 ve 8. sinif matematikte 1'er konu gorunuyor onu duzelt"
-- geri bildirimiyle: bu iki sinif seviyesinde sadece birer konu vardi
-- ("Ucgende Acilar" / "Ucgende Kenar Uzunluklari"), gercek MEB TTKB
-- ogretim programindaki diger unite basliklari eksikti. Asagidaki konular
-- eklendi (7. sinifta merkezi bir sinav olmadigi icin exam_types bos, 8.
-- sinif LGS'de test edildigi icin exam_types={LGS} - mevcut konularla ayni
-- desen).
--
-- NOT: Bu migration dosyasi dokumantasyon/tekrarlanabilirlik amaciyla
-- repoya eklenmistir - asagidaki INSERT'ler canli veritabaninda Supabase
-- MCP (execute_sql) ile ONCEDEN uygulanmistir.
-- ============================================================================

insert into topics (subject_id, grade_level, name, exam_types)
select id, 7, v.name, '{}'::exam_target[]
from subjects, (values
  ('Tam Sayılarla İşlemler'),
  ('Rasyonel Sayılar'),
  ('Cebirsel İfadeler'),
  ('Oran ve Orantı'),
  ('Yüzdeler'),
  ('Doğrusal Denklemler'),
  ('Çokgenlerde Açılar'),
  ('Çember ve Daire'),
  ('Veri Analizi (Sıklık Tablosu ve Histogram)'),
  ('Basit Olayların Olma Olasılığı'),
  ('Dönüşüm Geometrisi (Öteleme)')
) as v(name)
where subjects.name = 'Matematik';

insert into topics (subject_id, grade_level, name, exam_types)
select id, 8, v.name, '{LGS}'::exam_target[]
from subjects, (values
  ('Çarpanlar ve Katlar'),
  ('Üslü İfadeler'),
  ('Kareköklü İfadeler'),
  ('Veri Analizi'),
  ('Olasılık Hesaplamaları'),
  ('Cebirsel İfadeler ve Özdeşlikler'),
  ('Doğrusal Denklemler'),
  ('Eğim'),
  ('Eşitsizlikler'),
  ('Üçgende Açı-Kenar Bağıntıları ve Pisagor'),
  ('Dönüşüm Geometrisi'),
  ('Eşlik ve Benzerlik'),
  ('Geometrik Cisimler (Dik Prizmalar - Hacim ve Yüzey Alanı)')
) as v(name)
where subjects.name = 'Matematik';
