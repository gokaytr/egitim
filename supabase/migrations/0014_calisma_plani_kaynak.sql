-- study_plan_items'a kaynak etiketi ekleniyor: hedef veli tarafindan mi
-- elle atandi (manual), seviye tespit sinavindan mi geldi (placement), yoksa
-- eksik analizinden otomatik mi olusturuldu (auto). Rapor ekranlarinda
-- hangi hedefin nereden geldigini gostermek icin kullaniliyor.
alter table study_plan_items add column if not exists source text not null default 'manual' check (source in ('manual', 'placement', 'auto'));
