-- Anasayfa "ayarlar" ekranina yeni bir "Anasayfa Ayarlari" sekmesi eklendi.
-- Admin, anasayfadaki hero (ust) alanini ve alttaki 6 ozellik kutusunu
-- gorsel veya video olarak degistirebilir. Medya dosyalari, git deposunu
-- sismemesi icin repoya degil Supabase Storage'a (homepage-media bucket'i)
-- yukleniyor.

-- 1) Hero (ust, tam genislikte) alaninin medya ayari - tekil satir.
create table if not exists homepage_settings (
  id boolean primary key default true,
  hero_media_type text not null default 'image' check (hero_media_type in ('image', 'video')),
  -- Bos birakilirsa sayfadaki varsayilan gorsel (/grade-bg/varsayilan.jpg)
  -- kullanilmaya devam eder - mevcut gorsel asla kaybolmaz.
  hero_media_url text,
  updated_at timestamptz not null default now(),
  constraint homepage_settings_singleton check (id)
);

insert into homepage_settings (id) values (true) on conflict (id) do nothing;

alter table homepage_settings enable row level security;

-- Anasayfa herkese (giris yapmamis ziyaretciye de) acik oldugu icin okuma
-- politikasi auth.uid() sarti aramadan herkese aciktir.
create policy homepage_settings_read_all on homepage_settings
  for select
  using (true);

create policy homepage_settings_write_admin on homepage_settings
  for all
  using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

-- 2) "Odak ile neler degisir?" bolumundeki 6 kutunun medya ayari - her
-- kutu icin bir satir (1..6). Baslik/aciklama metinleri kodda sabit
-- kaliyor, sadece medya (gorsel/video) admin tarafindan degistirilebilir.
create table if not exists homepage_tiles (
  tile_index smallint primary key check (tile_index between 1 and 6),
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  media_url text,
  updated_at timestamptz not null default now()
);

insert into homepage_tiles (tile_index)
select generate_series(1, 6)
on conflict (tile_index) do nothing;

alter table homepage_tiles enable row level security;

create policy homepage_tiles_read_all on homepage_tiles
  for select
  using (true);

create policy homepage_tiles_write_admin on homepage_tiles
  for all
  using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

-- 3) Anasayfa medyalari (gorsel/video) icin herkese acik (public) bir
-- storage bucket'i. Yukleme/silme sadece admin rolune acik; okuma
-- herkese acik cunku bu dosyalar zaten anasayfada herkese gosteriliyor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homepage-media',
  'homepage-media',
  true,
  104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do nothing;

create policy homepage_media_public_read on storage.objects
  for select
  using (bucket_id = 'homepage-media');

create policy homepage_media_admin_insert on storage.objects
  for insert
  with check (bucket_id = 'homepage-media' and current_role_name() = 'admin');

create policy homepage_media_admin_update on storage.objects
  for update
  using (bucket_id = 'homepage-media' and current_role_name() = 'admin')
  with check (bucket_id = 'homepage-media' and current_role_name() = 'admin');

create policy homepage_media_admin_delete on storage.objects
  for delete
  using (bucket_id = 'homepage-media' and current_role_name() = 'admin');
