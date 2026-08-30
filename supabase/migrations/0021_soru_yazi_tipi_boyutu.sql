-- Ogrencinin "Genel Ayarlar > Sinav Ayarlari" formundan soru/deneme
-- ekranlarindaki soru ve sik metinlerinin yazi boyutunu ve yazi tipini
-- (fontunu) secebilmesi icin iki yeni tercih sutunu.
--
-- Not: student_quiz_settings tablosunun kendisini olusturan migration bu
-- repoda bulunamadi (muhtemelen daha once dogrudan veritabanina uygulanmis,
-- dosyaya yansitilmamis) - bu migration mevcut tabloya sutun ekliyor.
alter table public.student_quiz_settings
  add column if not exists font_size text not null default 'large'
    check (font_size in ('normal', 'large', 'xlarge')),
  add column if not exists font_family text not null default 'sans'
    check (font_family in ('sans', 'serif', 'mono'));

comment on column public.student_quiz_settings.font_size is 'Sinav/konu testi ekranlarinda soru ve siklarin yazi boyutu tercihi.';
comment on column public.student_quiz_settings.font_family is 'Sinav/konu testi ekranlarinda soru ve siklarin yazi tipi (font) tercihi.';
