-- current_role_name() RLS politikalarinda kullaniliyor ama kendisi de profiles
-- tablosunu sorguluyordu; SECURITY DEFINER olmadigi icin bu ic sorgu da RLS'e
-- tabi oluyor, RLS de tekrar current_role_name() cagirinca sonsuz donguye
-- girip "stack depth limit exceeded" hatasi veriyordu. SECURITY DEFINER ile
-- bu ic sorguyu RLS disina cikariyoruz (sadece kendi id'sinin rolunu okuyor,
-- guvenlik riski yok).
create or replace function public.current_role_name()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;
