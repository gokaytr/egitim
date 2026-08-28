-- ============================================================================
-- 1) Mufredati "ders ders" ayirmak icin: "Geometri" ayri bir ders degil,
--    Matematik dersinin bir konu grubuydu - konularini Matematik'e tasiyip
--    bos kalan Geometri dersini kaldiriyoruz. Ayrica LGS'nin diger temel
--    derslerini (henuz konu eklenmemis olsa da) listede gorunmesi icin
--    ekliyoruz.
-- ============================================================================
update topics
set subject_id = '11111111-1111-1111-1111-111111111111' -- Matematik
where subject_id = (select id from subjects where name = 'Geometri');

delete from subjects where name = 'Geometri';

insert into subjects (name, category) values
  ('Fen Bilimleri', 'ortaokul'),
  ('T.C. İnkılap Tarihi ve Atatürkçülük', 'ortaokul'),
  ('Din Kültürü ve Ahlak Bilgisi', 'ortaokul'),
  ('İngilizce', 'ortaokul')
on conflict do nothing;

-- ============================================================================
-- 2) Veli kendi cocugunu ekleyebilsin: parent_student_links tablosuna sadece
--    admin insert edebiliyordu, artik veli de (sadece kendi parent_id'siyle)
--    ekleyebilsin ve admin gerekirse baglantiyi kaldirabilsin.
-- ============================================================================
create policy parent_links_parent_write on parent_student_links
  for insert
  with check (parent_id = auth.uid() and current_role_name() = 'parent');

create policy parent_links_admin_delete on parent_student_links
  for delete
  using (current_role_name() = 'admin');

-- ============================================================================
-- 3) Veli raporunda "kac konu anlatimi izledi" sorusuna gercek bir cevap
--    verebilmek icin basit bir izleme kaydi.
-- ============================================================================
create table lesson_content_views (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  content_id uuid not null references lesson_contents(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

alter table lesson_content_views enable row level security;

create policy lesson_content_views_insert_own on lesson_content_views
  for insert
  with check (student_id = auth.uid());

create policy lesson_content_views_select on lesson_content_views
  for select
  using (
    student_id = auth.uid()
    or current_role_name() in ('admin', 'teacher', 'moderator')
    or exists (
      select 1 from parent_student_links l
      where l.parent_id = auth.uid() and l.student_id = lesson_content_views.student_id
    )
  );
