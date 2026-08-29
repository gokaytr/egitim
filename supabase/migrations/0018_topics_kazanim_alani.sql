-- Konulara opsiyonel "kazanim" (MEB mufredati ogrenme hedefi) metin alani ekler.
-- Zorunlu degildir; doldurulmak istendiginde kullanilir.
alter table topics add column if not exists kazanim text;
comment on column topics.kazanim is 'MEB muframati kazanim/ogrenme hedefi metni (opsiyonel).';
