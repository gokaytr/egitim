-- ============================================================================
-- Soru zorlugunu 1-5 sayisal olcekten 4 kademeli isimlendirilmis bir olcege
-- (kolay/orta/zor/cok_zor) tasir, ve "onay bekleyen" (is_approved=false)
-- sorularin artik ogrenciye de gosterilmesini saglar - is_approved artik
-- gorunurlugu degil, sadece "ogretmen kontrolunden gecti mi" bilgisini
-- (bir kalite rozeti) belirtir.
--
-- approved_by/approved_at kolonlari daha once dogrudan canli veritabanina
-- eklenmis ama hicbir migration dosyasinda kayitli degildi (approve-button.tsx
-- bu kolonlari zaten kullaniyordu) - burada IF NOT EXISTS ile bu durumu
-- migration gecmisine resmi olarak kaydediyoruz, canli db'de zaten var
-- olduklari icin bu satirlar orada no-op olacak.
-- ============================================================================

create type question_difficulty as enum ('kolay', 'orta', 'zor', 'cok_zor');

alter table questions add column difficulty_tier question_difficulty;

update questions set difficulty_tier = case
  when difficulty <= 2 then 'kolay'
  when difficulty = 3 then 'orta'
  when difficulty = 4 then 'zor'
  else 'cok_zor'
end::question_difficulty;

alter table questions alter column difficulty_tier set default 'orta';
alter table questions alter column difficulty_tier set not null;

alter table questions drop column difficulty;
alter table questions rename column difficulty_tier to difficulty;

alter table questions add column if not exists approved_by uuid references profiles(id) on delete set null;
alter table questions add column if not exists approved_at timestamptz;

-- Onay bekleyen sorular artik ogrenciye de gosteriliyor - "tum sorular
-- yayinda, ogretmen kontrolu ayri/paralel bir kalite katmani" karari geregi.
-- Diger okuma politikalariyla ayni desen: sadece giris yapmis kullanicilar
-- (subjects_read_all, topics_read_all ile tutarli).
drop policy if exists "questions_read_approved" on questions;
create policy "questions_read_all" on questions for select
  using (auth.uid() is not null);
