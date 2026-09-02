-- ============================================================================
-- 1) BİLSEM sınavı: kullanıcının "bilsem sınavını da ekle" talebiyle,
--    exam_target enum'una yeni bir değer ekleniyor (topics.exam_types bu
--    enum'un dizisi). courses tablosuna da referans olarak ekleniyor ki
--    Müfredat/Konu Ekle ekranındaki "Sınıf ve Kurslar" listesinde görünsün.
-- ============================================================================
alter type exam_target add value if not exists 'BILSEM';

insert into courses (name) values ('BILSEM') on conflict (name) do nothing;

-- ============================================================================
-- 2) "Yeni kural" işareti: kullanıcının "sisteme yeni kurala göre eklenecek
--    sorulara admin panelinde * olarak göster" talebi. Var olan ~968 soru
--    bu yeni içerik/kalite kuralları oturmadan önce eklenmişti - bu yüzden
--    once false default ile eklenip (mevcut satırlar false olur), sonra
--    default true'ya çevriliyor (bundan sonraki HER insert - elle/toplu/AI
--    fark etmez - otomatik olarak true gelir, hiçbir insert kodunu
--    değiştirmeye gerek kalmadan). Admin panelinde bu satırlarda "*"
--    gösterilecek (bkz. pending-questions-browser.tsx, recent-questions-card
--    .tsx) - kullanıcının notuyla "sistem oturunca" bu işaretleme kaldırılabilir.
-- ============================================================================
alter table questions add column if not exists follows_new_policy boolean not null default false;
alter table questions alter column follows_new_policy set default true;

comment on column questions.follows_new_policy is 'true ise bu soru question-generation.md/question-quality.md kuralları oturduktan SONRA eklendi (admin panelinde * ile gösterilir). Migration uygulandığında var olan tüm sorular false olarak işaretlendi, yeni default true.';

-- ============================================================================
-- 3) Sınav paylaşımı: admin bir sınavın (ör. TYT) tüm soru havuzunu, gizli
--    bir bağlantı ile dışarıdaki bir kişiyle paylaşabilsin - "sadece
--    paylaşılan kişi sorulari görebilsin" talebi, giriş gerektirmeyen ama
--    tahmin edilemez uzun bir token ile korunan bir link olarak uygulandı.
--    Bu tabloya anon/authenticated ROL için HİÇBİR select politikası
--    KASITLI OLARAK eklenmedi - token'ı normal Supabase istemcisinden (anon
--    key) sorgulayarak sızdırmak mümkün olmasın diye; genel /paylasim/[token]
--    sayfası SADECE sunucu tarafında createAdminClient() (service role,
--    RLS'i bypass eder) ile token doğrulaması yapıyor. Sadece admin (normal
--    oturumuyla) kendi oluşturduğu/tüm paylaşımları yönetebilir.
-- ============================================================================
create table if not exists exam_shares (
  id uuid primary key default gen_random_uuid(),
  exam_type text not null,
  token text not null unique,
  label text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table exam_shares enable row level security;

create policy exam_shares_admin_all on exam_shares
  for all
  using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

comment on table exam_shares is 'Admin''in bir sınavın tüm soru havuzunu (topics.exam_types eşleşmesiyle) gizli bir token linkiyle dışarıya paylaşması. /paylasim/[token] sayfası bu tabloyu SADECE service-role (RLS bypass) ile okur, hiçbir anon/authenticated select politikası yok.';
