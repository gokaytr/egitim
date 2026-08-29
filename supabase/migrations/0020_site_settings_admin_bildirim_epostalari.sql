-- Bildirim e-postalarinin (ogretmen basvurusu, yapilacak guncellemesi vb.)
-- gonderilecegi admin adreslerini Genel Ayarlar'dan duzenlenebilir hale
-- getirir. Bos birakilirsa role=admin kullanicilarinin e-postalarina
-- dusulur (bkz. src/lib/notifications/admin-recipients.ts).
alter table site_settings add column if not exists admin_notification_emails text;
comment on column site_settings.admin_notification_emails is 'Virgulle ayrilmis, sistem bildirimlerinin gonderilecegi admin e-posta adresleri. Bos ise role=admin kullanicilarinin e-postalarina dusulur.';
