-- Kullanicinin talebiyle: soru onay akisina "Reddet" durumu eklendi (aday
-- soru artik uc halden birinde: onay bekliyor / onaylandi / reddedildi), ve
-- admin panelinden acilip kapatilabilen "sadece onayli sorular ogrenciye
-- gorunsun" ayari eklendi. Ayrica mevcut TUM sorular (bu migration'dan once
-- eklenenlerin buyuk kismi dogrudan SQL ile is_approved varsayilan degeriyle
-- (true) eklendigi icin fiilen "onaylanmis" gorunuyordu) toplu olarak "onay
-- bekliyor" durumuna resetlendi - kullanicinin "tum sorular su an onaysiz
-- olsun, ama kullaniciya gorunmeye devam etsin" talebi geregi.

alter table questions add column if not exists is_rejected boolean not null default false;
alter table questions add column if not exists rejected_by uuid references profiles(id) on delete set null;
alter table questions add column if not exists rejected_at timestamptz;

alter table site_settings add column if not exists require_question_approval boolean not null default false;
comment on column site_settings.require_question_approval is
  'Acikken (true) sadece is_approved=true olan sorular ogrenciye/veliye gosterilir; kapaliyken (varsayilan, false) onay bekleyen sorular da mevcut davranista oldugu gibi gorunmeye devam eder. Admin/ogretmen/moderator rolleri bu ayardan bagimsiz olarak her zaman tum sorulari gorur.';

-- Mevcut tum (referans havuzu disindaki) sorular "onay bekliyor" durumuna
-- resetleniyor - referans havuzu sorulari (is_reference_only=true)
-- ogrenciye zaten hic gosterilmedigi icin bu resetin disinda tutuldu.
update questions
set is_approved = false, approved_by = null, approved_at = null
where is_reference_only = false;

drop policy if exists "questions_read_all" on questions;
create policy "questions_read_all" on questions for select
  using (
    auth.uid() is not null
    and (
      current_role_name() in ('admin','teacher','moderator')
      or (
        is_rejected = false
        and (
          is_approved = true
          or not coalesce((select require_question_approval from site_settings where id = true), false)
        )
      )
    )
  );
