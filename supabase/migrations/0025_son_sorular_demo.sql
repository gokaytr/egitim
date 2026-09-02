-- =====================================================================
-- Admin ve öğretmen Genel Bakış sayfalarındaki "Son Eklenen/Onaylanan
-- Sorular" listesi boş görünmesin diye, mevcut Matematik konularına
-- (0002_seed.sql) bağlı 10 adet demo soru ekliyoruz. Tarihleri kademeli
-- (staggered) veriyoruz ki liste "tarihine göre dizilsin" kuralı gerçek
-- veriyle de test edilebilsin. Sabit id kullanıyoruz ki migration tekrar
-- çalışırsa (on conflict do nothing) yinelenmesin.
-- =====================================================================

insert into questions (id, topic_id, difficulty, body, options, correct_option, explanation, source, is_approved, created_at, approved_at)
select
  v.id,
  (select id from topics where name = v.topic_name limit 1),
  v.difficulty::question_difficulty,
  v.body,
  v.options::jsonb,
  v.correct_option,
  v.explanation,
  'teacher'::question_source,
  v.is_approved,
  now() - (v.days_ago || ' days')::interval,
  case when v.is_approved then now() - (greatest(v.days_ago - 1, 0) || ' days')::interval else null end
from (values
  ('d1111111-0000-0000-0000-000000000001'::uuid, 'Fonksiyonlar', 'kolay', 'f(x) = 2x + 3 fonksiyonunda f(5) kaçtır?', '{"A":"10","B":"11","C":"13","D":"15"}', 'C', 'f(5) = 2*5 + 3 = 13 olarak bulunur.', true, 1),
  ('d1111111-0000-0000-0000-000000000002'::uuid, 'Fonksiyonlar', 'orta', 'f(x) = x^2 - 4 fonksiyonunun kökleri toplamı kaçtır?', '{"A":"-2","B":"0","C":"2","D":"4"}', 'B', 'Kökler x=2 ve x=-2 olduğundan toplamları 0''dır.', true, 2),
  ('d1111111-0000-0000-0000-000000000003'::uuid, 'Türev', 'orta', 'f(x) = x^3 fonksiyonunun türevi nedir?', '{"A":"x^2","B":"2x^2","C":"3x^2","D":"3x^3"}', 'C', 'Türev kuralına göre d/dx(x^3) = 3x^2''dir.', true, 3),
  ('d1111111-0000-0000-0000-000000000004'::uuid, 'Türev', 'zor', 'f(x) = sin(x)*cos(x) fonksiyonunun türevi hangisidir?', '{"A":"cos(2x)","B":"sin(2x)","C":"-cos(2x)","D":"-sin(2x)"}', 'A', 'Çarpım kuralıyla türev cos^2(x) - sin^2(x) = cos(2x) olur.', true, 4),
  ('d1111111-0000-0000-0000-000000000005'::uuid, 'Problemler', 'kolay', 'Bir sayının 3 katının 5 fazlası 20 ise bu sayı kaçtır?', '{"A":"3","B":"5","C":"7","D":"9"}', 'B', '3x + 5 = 20 denkleminden x = 5 bulunur.', true, 5),
  ('d1111111-0000-0000-0000-000000000006'::uuid, 'Problemler', 'orta', 'Ali''nin yaşı Veli''nin yaşının 2 katıdır. İkisinin yaş toplamı 30 ise Ali kaç yaşındadır?', '{"A":"10","B":"15","C":"20","D":"25"}', 'C', 'V + 2V = 30 → V=10, Ali=2V=20 olur.', false, 0),
  ('d1111111-0000-0000-0000-000000000007'::uuid, 'İntegral', 'zor', '∫(2x) dx integralinin sonucu nedir?', '{"A":"x","B":"x^2 + C","C":"2x^2 + C","D":"x^2/2 + C"}', 'B', '∫2x dx = x^2 + C''dir.', false, 0),
  ('d1111111-0000-0000-0000-000000000008'::uuid, 'İntegral', 'cok_zor', '∫(3x^2 - 2x) dx integralinin sonucu nedir?', '{"A":"x^3 - x^2 + C","B":"3x^3 - x^2 + C","C":"x^3 - 2x^2 + C","D":"3x^3 - 2x^2 + C"}', 'A', '∫3x^2 dx = x^3, ∫-2x dx = -x^2, toplamda x^3 - x^2 + C.', false, 0),
  ('d1111111-0000-0000-0000-000000000009'::uuid, 'Fonksiyonlar', 'orta', 'f(x) = 3x - 1 fonksiyonunun tersi f^-1(x) nedir?', '{"A":"(x+1)/3","B":"(x-1)/3","C":"3x+1","D":"x/3 - 1"}', 'A', 'y = 3x-1 → x = (y+1)/3, yani f^-1(x) = (x+1)/3.', true, 6),
  ('d1111111-0000-0000-0000-000000000010'::uuid, 'Problemler', 'kolay', 'Bir dikdörtgenin uzun kenarı 8 cm, kısa kenarı 5 cm ise alanı kaç cm^2''dir?', '{"A":"13","B":"26","C":"40","D":"45"}', 'C', 'Dikdörtgenin alanı uzun kenar * kısa kenar = 8*5 = 40 cm^2''dir.', true, 7)
) as v(id, topic_name, difficulty, body, options, correct_option, explanation, is_approved, days_ago)
where exists (select 1 from topics where name = v.topic_name)
on conflict (id) do nothing;
