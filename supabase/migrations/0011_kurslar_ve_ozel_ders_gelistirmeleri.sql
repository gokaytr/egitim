-- 1) Kurslar (sinav hazirlik kategorileri: LGS, TYT, AYT, YKS, KPSS, ALES).
-- topics.exam_types (text[]) zaten bu isimleri serbest metin olarak
-- tasiyor; bu tablo admin panelinde "Kurs Ekle" ile yonetilebilen,
-- kanonik bir referans listesi olarak calisiyor.
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table courses enable row level security;

create policy courses_read_all on courses
  for select
  using (auth.uid() is not null);

create policy courses_write_admin on courses
  for all
  using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

insert into courses (name) values
  ('LGS'), ('TYT'), ('AYT'), ('YKS'), ('KPSS'), ('ALES')
on conflict (name) do nothing;

-- 2) Ozel ders: veli kendi bagli oldugu ogrenci icin talep olusturabilsin
-- (mevcut politika sadece ogrencinin kendisine, atanan ogretmene ve admine
-- izin veriyordu).
create policy tutor_referrals_parent_manage on tutor_referrals
  for all
  using (
    current_role_name() = 'parent'
    and exists (
      select 1 from parent_student_links l
      where l.parent_id = auth.uid() and l.student_id = tutor_referrals.student_id
    )
  )
  with check (
    current_role_name() = 'parent'
    and exists (
      select 1 from parent_student_links l
      where l.parent_id = auth.uid() and l.student_id = tutor_referrals.student_id
    )
  );

-- 3) Canli ders linki (ogretmenin kendi Google Meet/Zoom linkini yapistirdigi alan).
alter table tutor_sessions add column if not exists meeting_link text;
