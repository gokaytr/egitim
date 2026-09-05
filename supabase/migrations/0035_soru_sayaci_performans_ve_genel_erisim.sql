-- Konu basina soru sayisi (admin/ogretmen panelindeki "X/60 soru" rozeti)
-- su ana kadar TUM sorulari (topic_id, is_reference_only=false) tek tek
-- ceken bir sorguyla client tarafinda sayiliyordu. questions tablosu artik
-- 2000+ satir oldugu icin, Supabase'in varsayilan max-rows (1000) siniri bu
-- sorguyu sessizce kirpiyor - bazi konularin sayaci gercekte oldugundan az
-- gorunuyordu (ör. "Okulumuzda Hayat" 60/60 iken 51/60 gorunmesi). Bunun
-- yerine veritabaninda GROUP BY ile agregasyon yapan, konu basina TEK satir
-- donen bir fonksiyon kullaniliyor - hem 1000 satir sinirindan tamamen
-- kacinir hem de hem toplam hem onayli sayiyi tek sorguda getirir (boylece
-- konu listesinde "tamamen onaylandi mi" rozeti de gosterilebilir).
create or replace function public.question_counts_by_topic(subject_ids uuid[] default null)
returns table (topic_id uuid, total bigint, approved bigint)
language sql
security invoker
stable
set search_path = public
as $$
  select
    q.topic_id,
    count(*) as total,
    count(*) filter (where q.is_approved and not q.is_rejected) as approved
  from questions q
  join topics t on t.id = q.topic_id
  where q.is_reference_only = false
    and (subject_ids is null or t.subject_id = any(subject_ids))
  group by q.topic_id;
$$;

grant execute on function public.question_counts_by_topic(uuid[]) to authenticated;

-- Anasayfadaki "Konu"/"Soru" sayaci: topics_read_all ve questions_read_all
-- politikalari "auth.uid() is not null" sarti tasidigi icin GIRIS YAPMAMIS
-- (anonim) bir ziyaretci anasayfaya geldiginde bu sayimlar RLS tarafindan
-- 0'a dusuruluyordu. Icerigi anonim kullaniciya ACMADAN (asil sorular/konu
-- detaylari hala sadece giris yapan kullanicilara gorunur), sadece TOPLAM
-- sayiyi donen iki SECURITY DEFINER fonksiyon ekleniyor - boylece anasayfa
-- (ve mobil gorunumu) giris yapilmadan da dogru rakamlari gosterebiliyor.
create or replace function public.public_topic_count()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int from topics;
$$;

create or replace function public.public_question_count()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
  from questions q
  where q.is_reference_only = false
    and q.is_rejected = false
    and (
      q.is_approved = true
      or not coalesce((select require_question_approval from site_settings where id = true), false)
    );
$$;

grant execute on function public.public_topic_count() to anon, authenticated;
grant execute on function public.public_question_count() to anon, authenticated;
