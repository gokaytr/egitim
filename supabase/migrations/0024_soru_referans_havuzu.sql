-- ============================================================================
-- "Referans Havuzu": ogrenciye ASLA gosterilmeyen, sadece yapay zekanin
-- ornek/egitim amacli kaynak olarak kullandigi ayri bir soru havuzu.
-- is_approved (kalite kontrolu, bkz. 0023_soru_zorluk_kademesi_ve_yayin_kurali.sql)
-- ile karistirilmamali - is_reference_only true olan bir soru is_approved
-- durumundan bagimsiz olarak hicbir ogrenci akisinda (konu testi, cevap
-- anahtari, deneme/seviye tespit montaji) asla secilmez/gosterilmez.
-- ============================================================================

alter table questions add column if not exists is_reference_only boolean not null default false;

comment on column questions.is_reference_only is 'true ise bu soru ogrenciye hicbir sekilde gosterilmez/yayinlanmaz; sadece yapay zekanin ornek olarak egitilmesi/referans almasi icin saklanir.';
