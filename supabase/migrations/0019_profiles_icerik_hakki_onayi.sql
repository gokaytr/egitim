-- Kullanicinin soru ekleme icerik kullanim hakki onayini ilk kez kabul
-- ettigi ani saklar. Dolu ise, soru ekle ekraninda bu onay bir daha
-- sorulmaz (tek seferlik onay).
alter table profiles add column if not exists content_rights_ack_at timestamptz;
comment on column profiles.content_rights_ack_at is 'Kullanicinin soru ekleme icerik kullanim hakki onayini ilk kez kabul ettigi an. Dolu ise bir daha sorulmaz.';
