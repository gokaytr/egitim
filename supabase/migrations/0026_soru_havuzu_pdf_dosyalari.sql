-- ============================================================================
-- Soru Havuzu ekranina yuklenen PDF/Word dosyalarini (yapay zekaya ham metin
-- olarak verilen kaynak dosyalar) izleyebilmek icin: admin panelinde "PDF'ler"
-- adinda ayri bir sekme acilip, hangi dosyalarin yuklendigi ve silinebilecegi
-- gorulebilsin diye. Dosyalarin kendisi (potansiyel olarak telifli ÖSYM sinav
-- kagitlari) git deposuna degil, ozel (public olmayan) bir Supabase Storage
-- bucket'ina yukleniyor - homepage-media bucket'iyla ayni desen, ama bu sefer
-- SADECE admin okuyup/silebilir (herkese acik degil).
-- ============================================================================

create table if not exists reference_pool_files (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null,
  mime_type text,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table reference_pool_files is 'Soru Havuzu (AI egitim referansi) ekranina yuklenen PDF/Word/metin dosyalarinin kaydi - dosyanin kendisi reference-pool-files storage bucketinda tutulur.';

alter table reference_pool_files enable row level security;

create policy reference_pool_files_admin_all on reference_pool_files
  for all
  using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reference-pool-files',
  'reference-pool-files',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do nothing;

create policy reference_pool_files_storage_admin_select on storage.objects
  for select
  using (bucket_id = 'reference-pool-files' and current_role_name() = 'admin');

create policy reference_pool_files_storage_admin_insert on storage.objects
  for insert
  with check (bucket_id = 'reference-pool-files' and current_role_name() = 'admin');

create policy reference_pool_files_storage_admin_delete on storage.objects
  for delete
  using (bucket_id = 'reference-pool-files' and current_role_name() = 'admin');
