create table if not exists teacher_students (
  teacher_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (teacher_id, student_id)
);

alter table teacher_students enable row level security;

create policy teacher_students_admin_all on teacher_students
  for all
  using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy teacher_students_teacher_view on teacher_students
  for select
  using (teacher_id = auth.uid());

alter table diagnoses add column if not exists acknowledged_at timestamptz;

create policy diagnoses_student_acknowledge on diagnoses
  for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
