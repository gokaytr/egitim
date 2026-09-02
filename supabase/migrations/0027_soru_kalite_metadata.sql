-- ============================================================================
-- question-quality.md'deki otomatik kalite kontrol sistemi icin: AI'nin her
-- sordugu soruya kendi verdigi kalite puanini (0-100) ve bilissel duzey/soru
-- tipi etiketlerini saklamak icin nullable kolonlar. Bu alanlar SADECE
-- source='ai' ile uretilen sorularda doluyor (elle/toplu/AI-parse edilen
-- sorularda bos kalir) - ileride zayif konu analizi/adaptif soru secimi icin
-- kullanilabilir (bkz. question-generation.md §3, question-quality.md §5).
-- ============================================================================

alter table questions add column if not exists quality_score smallint;
alter table questions add column if not exists cognitive_level text;
alter table questions add column if not exists question_type text;

comment on column questions.quality_score is 'AI soru uretirken kendi kendine verdigi 0-100 kalite puani (question-quality.md rubrigi) - 80 altindaki taslaklar zaten veritabanina yazilmadan sunucu tarafinda elenir, bu kolon kabul edilenin puanini kayit altina alir.';
comment on column questions.cognitive_level is 'Hatırlama/Anlama/Uygulama/Analiz/Değerlendirme/Üst düzey düşünme - AI tarafindan verilir, nullable.';
comment on column questions.question_type is 'Soru tipi (paragraf, problem çözme, tablo yorumlama, vb.) - AI tarafindan verilir, nullable.';
