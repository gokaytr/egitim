-- Ogretmen kayitlari artik dogrudan "teacher" rolu almiyor: admin onayina dusuyor.
-- Ogrenci ve veli kayitlari degismeden dogrudan kendi rolleriyle olusuyor.

alter table profiles add column if not exists teacher_pending boolean not null default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'student');
  wants_teacher boolean := requested_role = 'teacher_pending';
  final_role user_role := case
    when requested_role in ('student', 'parent', 'teacher', 'admin') then requested_role::user_role
    else 'student'::user_role
  end;
begin
  insert into public.profiles (id, full_name, email, role, grade_level, exam_target, teacher_pending)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    final_role,
    nullif(new.raw_user_meta_data->>'grade_level', '')::int,
    nullif(new.raw_user_meta_data->>'exam_target', '')::exam_target,
    wants_teacher
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
