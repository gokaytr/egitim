-- Ogretmen <-> ders (brans) atamasi. Bir ogretmen birden fazla dersle
-- iliskilendirilebilir; admin panelinden yonetilir.
create table if not exists teacher_subjects (
  teacher_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (teacher_id, subject_id)
);

alter table teacher_subjects enable row level security;

create policy teacher_subjects_read_all on teacher_subjects
  for select
  using (auth.uid() is not null);

create policy teacher_subjects_write_admin on teacher_subjects
  for all
  using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');
