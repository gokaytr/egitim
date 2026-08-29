-- Site geneli ziyaret takibi: her sayfa goruntulemesi (public sayfalar dahil)
-- burada kayit altina aliniyor. middleware.ts, her istekte (statik dosyalar
-- ve /api haric) bir satir ekliyor. Ziyaretci kimligi, tarayiciya yazilan
-- uzun omurlu bir cerezden (ov_vid) geliyor; giris yapmis kullanicilarda
-- ayrica user_id de dolduruluyor.

create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  visitor_id text not null,
  is_new_visitor boolean not null default false,
  user_id uuid references profiles(id) on delete set null,
  country text,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on page_views (created_at);
create index if not exists page_views_path_idx on page_views (path);
create index if not exists page_views_visitor_id_idx on page_views (visitor_id);

alter table page_views enable row level security;

-- Anonim ziyaretciler dahil herkes kendi sayfa goruntulemesini ekleyebilir -
-- bu tabloda kisisel/hassas veri yok (sadece yol, cerez id'si, ulke, varsa
-- kullanici id'si).
create policy "page_views_insert_anyone" on page_views
  for insert
  with check (true);

-- Sadece admin okuyabilir (analitik ekrani).
create policy "page_views_select_admin" on page_views
  for select
  using (current_role_name() = 'admin');
