-- Belirli e-posta adresleri kayit olurken (ya da Google ile ilk girdiklerinde)
-- otomatik olarak admin rolu alir. Yeni admin eklemek icin buraya satir eklemek
-- yeterli, kod degisikligi gerekmiyor:
--   insert into admin_allowlist (email) values ('yeni-admin@ornek.com');

create table if not exists admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table admin_allowlist enable row level security;

drop policy if exists "admin_allowlist_admin_only" on admin_allowlist;
create policy "admin_allowlist_admin_only" on admin_allowlist for all
  using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

insert into admin_allowlist (email) values ('gokayterzi@gmail.com')
on conflict (email) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'student');
  wants_teacher boolean := requested_role = 'teacher_pending';
  is_allowlisted_admin boolean := exists (
    select 1 from admin_allowlist a where lower(a.email) = lower(new.email)
  );
  final_role user_role;
begin
  if is_allowlisted_admin then
    final_role := 'admin'::user_role;
    wants_teacher := false;
  else
    final_role := case
      when requested_role in ('student', 'parent', 'teacher', 'admin') then requested_role::user_role
      else 'student'::user_role
    end;
  end if;

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
  on conflict (id) do update set
    role = case when is_allowlisted_admin then excluded.role else profiles.role end,
    teacher_pending = case when is_allowlisted_admin then false else profiles.teacher_pending end;

  return new;
end;
$$;
