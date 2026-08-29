-- Ogrenci "seviye tespit sinavi" sonucunu profiles uzerinde tutuyoruz, boylece
-- "sana uygun deneme oner" akisi bu seviyeye gore soru zorlugu secebiliyor.
-- level_label: 'baslangic' | 'orta' | 'iyi' | 'cok_iyi' (app tarafinda kontrol edilir).
-- level_score: son seviye tespit sinavindaki basari yuzdesi (0-100).

alter table profiles
  add column if not exists level_label text,
  add column if not exists level_score integer,
  add column if not exists level_assessed_at timestamptz;
