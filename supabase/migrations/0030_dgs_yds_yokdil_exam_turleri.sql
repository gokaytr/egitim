-- ============================================================================
-- Kullanicinin "kamu sinavlari ve ingilizce bolumlerinin de konularini
-- ekledim, onlari da sisteme ekle" talebiyle: DGS (Dikey Gecis Sinavi) ve
-- ileri duzey Ingilizce yeterlik sinavlari (YDS/e-YDS/YOKDIL) icin yeni
-- exam_target enum degerleri. e-YDS, YDS ile AYNI mufredati/soru tipini
-- kullandigi icin (sadece bilgisayar tabanli surumu) ayri bir deger
-- ACILMADI, konular tek bir 'YDS' etiketi altinda birlestirildi.
--
-- NOT: Bu migration dosyasi dokumantasyon/tekrarlanabilirlik amaciyla
-- repoya eklenmistir - enum degerleri gercek veritabaninda Supabase MCP
-- (apply_migration) ile bu SQL'in ayni icerigiyle ONCEDEN uygulanmistir.
-- ============================================================================
alter type exam_target add value if not exists 'DGS';
alter type exam_target add value if not exists 'YDS';
alter type exam_target add value if not exists 'YOKDIL';
