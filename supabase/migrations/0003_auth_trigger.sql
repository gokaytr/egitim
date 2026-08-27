-- auth.users tablosuna yeni kullanici eklendiginde otomatik profiles satiri olusturan trigger.
-- Kayit formu artik profiles tablosuna dogrudan INSERT yapmiyor (RLS hatasi veriyordu),
-- bunun yerine supabase.auth.signUp({ options: { data: {...} } }) ile metadata gonderiyor
-- ve bu trigger o metadata'dan profiles satirini olusturuyor.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, grade_level, exam_target)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    nullif(new.raw_user_meta_data->>'grade_level', '')::int,
    nullif(new.raw_user_meta_data->>'exam_target', '')::exam_target
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
