-- ============================================================================
-- Kullanicinin "her konu icin en az 3 ayri test olsun, 1-2 diye siralansin,
-- biri kolay birisi daha zor olsun" talebiyle: bir konunun sorularini
-- numarali test gruplarina ayirmak icin questions tablosuna test_number
-- eklendi. NULL = eski davranis (o konunun sorulari hala tek/duz bir test
-- olarak gosterilir, gruplama yok) - boylece mevcut 975 sorunun tamami
-- (grade-1 Turkce disinda) etkilenmeden calismaya devam eder. Bir konunun
-- sorularina test_number atandiginda (1, 2, 3, ...) ogrenci ekraninda o
-- konu artik "Test 1 / Test 2 / Test 3" seklinde ayri ayri secilebilir
-- kartlar olarak gorunur (bkz. src/app/ogrenci/konu/[topicId]/page.tsx).
--
-- NOT: Bu migration dosyasi dokumantasyon/tekrarlanabilirlik amaciyla
-- repoya eklenmistir - asagidaki ALTER TABLE canli veritabaninda Supabase
-- MCP (apply_migration) ile ONCEDEN uygulanmistir.
-- ============================================================================

alter table questions add column test_number smallint null;

comment on column questions.test_number is
  'Konu icindeki numarali test grubu (1, 2, 3, ...). NULL ise soru eski/gruplanmamis akista gosterilir.';
