-- ============================================================================
-- Türkiye Eğitim Platformu - İlk şema
-- Roller: admin, teacher, student, parent
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ROLLER VE PROFİLLER
-- ---------------------------------------------------------------------------
create type user_role as enum ('admin', 'teacher', 'student', 'parent');
create type exam_target as enum ('LGS', 'TYT', 'AYT', 'YKS', 'YDT', 'KPSS', 'ALES', 'DIGER');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'student',
  full_name text not null,
  email text not null,
  phone text,
  grade_level int check (grade_level between 1 and 12),
  exam_target exam_target,
  created_at timestamptz not null default now()
);

-- Veli - öğrenci bağlantısı
create table parent_student_links (
  parent_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id)
);

-- Özel ders öğretmeni ek bilgileri
create table tutor_profiles (
  profile_id uuid primary key references profiles(id) on delete cascade,
  subjects text[] not null default '{}',
  bio text,
  hourly_rate numeric,
  is_available boolean not null default true
);

-- ---------------------------------------------------------------------------
-- MÜFREDAT: ders / konu ağacı (1. sınıftan 12. sınıfa + üniversite sınavları)
-- ---------------------------------------------------------------------------
create table subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('ilkokul','ortaokul','lise','universite_hazirlik')),
  created_at timestamptz not null default now()
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  parent_topic_id uuid references topics(id) on delete cascade,
  name text not null,
  grade_level int check (grade_level between 1 and 12),
  exam_types exam_target[] not null default '{}',
  difficulty_level int not null default 3 check (difficulty_level between 1 and 5),
  estimated_minutes int not null default 60,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- Konu anlatım içerikleri (öğretmen ekler)
create table lesson_contents (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete set null,
  title text not null,
  content_md text not null,
  video_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- SORU BANKASI
-- ---------------------------------------------------------------------------
create type question_source as enum ('teacher', 'ai', 'past_exam');

create table questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  difficulty int not null default 3 check (difficulty between 1 and 5),
  body text not null,
  image_url text,
  options jsonb not null,             -- {"A":"...", "B":"...", "C":"...", "D":"..."}
  correct_option text not null,       -- "A" | "B" | "C" | "D"
  explanation text,
  option_error_tags jsonb default '{}', -- {"B": "işlem_hatası", "C": "kavram_yanilgisi"}
  source question_source not null default 'teacher',
  exam_year int,
  is_approved boolean not null default true,
  created_at timestamptz not null default now()
);

-- Denemeler / testler
create type exam_type as enum ('deneme', 'seviye_tespit', 'konu_testi');

create table exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  exam_type exam_type not null default 'deneme',
  grade_level int,
  exam_target exam_target,
  duration_minutes int not null default 40,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table exam_questions (
  exam_id uuid not null references exams(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  order_index int not null default 0,
  primary key (exam_id, question_id)
);

-- ---------------------------------------------------------------------------
-- ÖĞRENCİ ÇÖZÜMLERİ VE TANI (AI eksik tespiti)
-- ---------------------------------------------------------------------------
create table student_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  exam_id uuid references exams(id) on delete set null,
  topic_id uuid references topics(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  total_questions int not null default 0,
  correct_count int not null default 0,
  wrong_count int not null default 0,
  empty_count int not null default 0
);

create table answer_logs (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references student_attempts(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected_option text,
  is_correct boolean not null default false,
  time_spent_seconds int,
  error_tag text
);

create type weakness_level as enum ('none', 'minor', 'major');
create type recommended_action as enum ('practice_more', 'watch_video', 'tutor_referral', 'none');

create table diagnoses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  topic_id uuid references topics(id) on delete set null,
  attempt_id uuid references student_attempts(id) on delete set null,
  weakness_level weakness_level not null default 'none',
  ai_summary text,
  common_error_pattern text,
  recommended_action recommended_action not null default 'none',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- YILLIK ÇALIŞMA PROGRAMI
-- ---------------------------------------------------------------------------
create type plan_item_status as enum ('not_started', 'in_progress', 'done');

create table study_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  exam_target exam_target not null,
  start_date date not null default current_date,
  end_date date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table study_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references study_plans(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  planned_week int not null default 1,
  target_minutes int not null default 60,
  target_questions int not null default 20,
  status plan_item_status not null default 'not_started'
);

-- ---------------------------------------------------------------------------
-- ÖZEL DERS YÖNLENDİRME
-- ---------------------------------------------------------------------------
create type referral_status as enum ('pending', 'matched', 'scheduled', 'completed', 'cancelled');

create table tutor_referrals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  topic_id uuid references topics(id) on delete set null,
  tutor_id uuid references profiles(id) on delete set null,
  status referral_status not null default 'pending',
  requested_at timestamptz not null default now()
);

create table tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references tutor_referrals(id) on delete cascade,
  scheduled_at timestamptz,
  duration_minutes int default 60,
  teacher_notes text,
  status text not null default 'planned'
);

-- ---------------------------------------------------------------------------
-- BİLDİRİMLER
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================
alter table profiles enable row level security;
alter table parent_student_links enable row level security;
alter table tutor_profiles enable row level security;
alter table subjects enable row level security;
alter table topics enable row level security;
alter table lesson_contents enable row level security;
alter table questions enable row level security;
alter table exams enable row level security;
alter table exam_questions enable row level security;
alter table student_attempts enable row level security;
alter table answer_logs enable row level security;
alter table diagnoses enable row level security;
alter table study_plans enable row level security;
alter table study_plan_items enable row level security;
alter table tutor_referrals enable row level security;
alter table tutor_sessions enable row level security;
alter table notifications enable row level security;

-- Yardımcı fonksiyon: mevcut kullanıcının rolü
create or replace function current_role_name()
returns user_role
language sql stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- PROFILES
create policy "profiles_select_own_or_admin" on profiles for select
  using (id = auth.uid() or current_role_name() = 'admin');
create policy "profiles_select_teacher_students" on profiles for select
  using (current_role_name() = 'teacher');
create policy "profiles_select_parent_children" on profiles for select
  using (exists (select 1 from parent_student_links l where l.parent_id = auth.uid() and l.student_id = profiles.id));
create policy "profiles_update_own" on profiles for update
  using (id = auth.uid() or current_role_name() = 'admin');
create policy "profiles_insert_own" on profiles for insert
  with check (id = auth.uid());

-- SUBJECTS / TOPICS / LESSON CONTENTS - herkes (giriş yapan) okuyabilir, admin+teacher yazabilir
create policy "subjects_read_all" on subjects for select using (auth.uid() is not null);
create policy "subjects_write_staff" on subjects for all
  using (current_role_name() in ('admin','teacher')) with check (current_role_name() in ('admin','teacher'));

create policy "topics_read_all" on topics for select using (auth.uid() is not null);
create policy "topics_write_staff" on topics for all
  using (current_role_name() in ('admin','teacher')) with check (current_role_name() in ('admin','teacher'));

create policy "lesson_contents_read_all" on lesson_contents for select using (auth.uid() is not null);
create policy "lesson_contents_write_staff" on lesson_contents for all
  using (current_role_name() in ('admin','teacher')) with check (current_role_name() in ('admin','teacher'));

-- QUESTIONS - öğrenci sadece onaylı soruları görebilir; öğretmen/admin hepsini görüp yazabilir
create policy "questions_read_approved" on questions for select
  using (is_approved = true or current_role_name() in ('admin','teacher'));
create policy "questions_write_staff" on questions for all
  using (current_role_name() in ('admin','teacher')) with check (current_role_name() in ('admin','teacher'));

-- EXAMS
create policy "exams_read_all" on exams for select using (auth.uid() is not null);
create policy "exams_write_staff" on exams for all
  using (current_role_name() in ('admin','teacher')) with check (current_role_name() in ('admin','teacher'));
create policy "exam_questions_read_all" on exam_questions for select using (auth.uid() is not null);
create policy "exam_questions_write_staff" on exam_questions for all
  using (current_role_name() in ('admin','teacher')) with check (current_role_name() in ('admin','teacher'));

-- STUDENT ATTEMPTS / ANSWER LOGS - öğrenci sadece kendisininkini, öğretmen/admin hepsini, veli çocuğununkini görür
create policy "attempts_owner" on student_attempts for all
  using (student_id = auth.uid() or current_role_name() in ('admin','teacher'))
  with check (student_id = auth.uid() or current_role_name() in ('admin','teacher'));
create policy "attempts_parent_view" on student_attempts for select
  using (exists (select 1 from parent_student_links l where l.parent_id = auth.uid() and l.student_id = student_attempts.student_id));

create policy "answer_logs_owner" on answer_logs for all
  using (exists (select 1 from student_attempts a where a.id = answer_logs.attempt_id and (a.student_id = auth.uid() or current_role_name() in ('admin','teacher'))))
  with check (exists (select 1 from student_attempts a where a.id = answer_logs.attempt_id and (a.student_id = auth.uid() or current_role_name() in ('admin','teacher'))));

-- DIAGNOSES
create policy "diagnoses_owner" on diagnoses for select
  using (student_id = auth.uid() or current_role_name() in ('admin','teacher'));
create policy "diagnoses_parent_view" on diagnoses for select
  using (exists (select 1 from parent_student_links l where l.parent_id = auth.uid() and l.student_id = diagnoses.student_id));
create policy "diagnoses_insert_system" on diagnoses for insert
  with check (student_id = auth.uid() or current_role_name() in ('admin','teacher'));

-- STUDY PLANS
create policy "study_plans_owner" on study_plans for all
  using (student_id = auth.uid() or current_role_name() in ('admin','teacher'))
  with check (student_id = auth.uid() or current_role_name() in ('admin','teacher'));
create policy "study_plan_items_owner" on study_plan_items for all
  using (exists (select 1 from study_plans p where p.id = study_plan_items.plan_id and (p.student_id = auth.uid() or current_role_name() in ('admin','teacher'))))
  with check (exists (select 1 from study_plans p where p.id = study_plan_items.plan_id and (p.student_id = auth.uid() or current_role_name() in ('admin','teacher'))));

-- TUTOR REFERRALS / SESSIONS
create policy "tutor_referrals_owner" on tutor_referrals for all
  using (student_id = auth.uid() or tutor_id = auth.uid() or current_role_name() = 'admin')
  with check (student_id = auth.uid() or tutor_id = auth.uid() or current_role_name() = 'admin');
create policy "tutor_sessions_owner" on tutor_sessions for all
  using (exists (select 1 from tutor_referrals r where r.id = tutor_sessions.referral_id and (r.student_id = auth.uid() or r.tutor_id = auth.uid() or current_role_name() = 'admin')))
  with check (exists (select 1 from tutor_referrals r where r.id = tutor_sessions.referral_id and (r.student_id = auth.uid() or r.tutor_id = auth.uid() or current_role_name() = 'admin')));
create policy "tutor_profiles_read_all" on tutor_profiles for select using (auth.uid() is not null);
create policy "tutor_profiles_write_own" on tutor_profiles for all
  using (profile_id = auth.uid() or current_role_name() = 'admin')
  with check (profile_id = auth.uid() or current_role_name() = 'admin');

-- NOTIFICATIONS
create policy "notifications_owner" on notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- PARENT LINKS
create policy "parent_links_involved" on parent_student_links for select
  using (parent_id = auth.uid() or student_id = auth.uid() or current_role_name() = 'admin');
create policy "parent_links_admin_write" on parent_student_links for insert
  with check (current_role_name() = 'admin');
