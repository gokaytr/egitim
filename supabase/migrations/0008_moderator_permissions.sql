-- Moderator, ogretmenle ayni yetkilere sahip: mevcut 'teacher' kontrollu tum
-- RLS politikalarina 'moderator' de ekleniyor. Ayrica handle_new_user'in
-- kabul ettigi rol listesine de moderator ekleniyor (admin panelinden rol
-- degistirirken kullanilabilsin diye, signup akisinda kullanilmiyor).

drop policy if exists "subjects_write_staff" on subjects;
create policy "subjects_write_staff" on subjects for all
  using (current_role_name() in ('admin','teacher','moderator')) with check (current_role_name() in ('admin','teacher','moderator'));

drop policy if exists "topics_write_staff" on topics;
create policy "topics_write_staff" on topics for all
  using (current_role_name() in ('admin','teacher','moderator')) with check (current_role_name() in ('admin','teacher','moderator'));

drop policy if exists "lesson_contents_write_staff" on lesson_contents;
create policy "lesson_contents_write_staff" on lesson_contents for all
  using (current_role_name() in ('admin','teacher','moderator')) with check (current_role_name() in ('admin','teacher','moderator'));

drop policy if exists "questions_read_approved" on questions;
create policy "questions_read_approved" on questions for select
  using (is_approved = true or current_role_name() in ('admin','teacher','moderator'));

drop policy if exists "questions_write_staff" on questions;
create policy "questions_write_staff" on questions for all
  using (current_role_name() in ('admin','teacher','moderator')) with check (current_role_name() in ('admin','teacher','moderator'));

drop policy if exists "exams_write_staff" on exams;
create policy "exams_write_staff" on exams for all
  using (current_role_name() in ('admin','teacher','moderator')) with check (current_role_name() in ('admin','teacher','moderator'));

drop policy if exists "exam_questions_write_staff" on exam_questions;
create policy "exam_questions_write_staff" on exam_questions for all
  using (current_role_name() in ('admin','teacher','moderator')) with check (current_role_name() in ('admin','teacher','moderator'));

drop policy if exists "attempts_owner" on student_attempts;
create policy "attempts_owner" on student_attempts for all
  using (student_id = auth.uid() or current_role_name() in ('admin','teacher','moderator'))
  with check (student_id = auth.uid() or current_role_name() in ('admin','teacher','moderator'));

drop policy if exists "answer_logs_owner" on answer_logs;
create policy "answer_logs_owner" on answer_logs for all
  using (exists (select 1 from student_attempts a where a.id = answer_logs.attempt_id and (a.student_id = auth.uid() or current_role_name() in ('admin','teacher','moderator'))))
  with check (exists (select 1 from student_attempts a where a.id = answer_logs.attempt_id and (a.student_id = auth.uid() or current_role_name() in ('admin','teacher','moderator'))));

drop policy if exists "diagnoses_owner" on diagnoses;
create policy "diagnoses_owner" on diagnoses for select
  using (student_id = auth.uid() or current_role_name() in ('admin','teacher','moderator'));

drop policy if exists "diagnoses_insert_system" on diagnoses;
create policy "diagnoses_insert_system" on diagnoses for insert
  with check (student_id = auth.uid() or current_role_name() in ('admin','teacher','moderator'));

drop policy if exists "study_plans_owner" on study_plans;
create policy "study_plans_owner" on study_plans for all
  using (student_id = auth.uid() or current_role_name() in ('admin','teacher','moderator'))
  with check (student_id = auth.uid() or current_role_name() in ('admin','teacher','moderator'));

drop policy if exists "study_plan_items_owner" on study_plan_items;
create policy "study_plan_items_owner" on study_plan_items for all
  using (exists (select 1 from study_plans p where p.id = study_plan_items.plan_id and (p.student_id = auth.uid() or current_role_name() in ('admin','teacher','moderator'))))
  with check (exists (select 1 from study_plans p where p.id = study_plan_items.plan_id and (p.student_id = auth.uid() or current_role_name() in ('admin','teacher','moderator'))));

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
      when requested_role in ('student', 'parent', 'teacher', 'admin', 'moderator') then requested_role::user_role
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
