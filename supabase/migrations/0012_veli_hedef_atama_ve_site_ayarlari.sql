-- 1) Veli, bagli oldugu ogrenci icin hedef (calisma programi kalemi)
-- atayabilsin (mevcut politikalar sadece ogrencinin kendisine ve
-- admin/ogretmen/moderatore izin veriyordu).
create policy study_plans_parent_manage on study_plans
  for all
  using (
    current_role_name() = 'parent'
    and exists (
      select 1 from parent_student_links l
      where l.parent_id = auth.uid() and l.student_id = study_plans.student_id
    )
  )
  with check (
    current_role_name() = 'parent'
    and exists (
      select 1 from parent_student_links l
      where l.parent_id = auth.uid() and l.student_id = study_plans.student_id
    )
  );

create policy study_plan_items_parent_manage on study_plan_items
  for all
  using (
    current_role_name() = 'parent'
    and exists (
      select 1 from study_plans p
      join parent_student_links l on l.student_id = p.student_id
      where p.id = study_plan_items.plan_id and l.parent_id = auth.uid()
    )
  )
  with check (
    current_role_name() = 'parent'
    and exists (
      select 1 from study_plans p
      join parent_student_links l on l.student_id = p.student_id
      where p.id = study_plan_items.plan_id and l.parent_id = auth.uid()
    )
  );

-- 2) Admin panelindeki "Genel Ayarlar" icin tek satirlik basit bir
-- key/value ayar tablosu.
create table if not exists site_settings (
  id boolean primary key default true,
  site_name text not null default 'Odak',
  support_email text,
  maintenance_mode boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id)
);

insert into site_settings (id) values (true) on conflict (id) do nothing;

alter table site_settings enable row level security;

create policy site_settings_read_all on site_settings
  for select
  using (auth.uid() is not null);

create policy site_settings_write_admin on site_settings
  for all
  using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');
