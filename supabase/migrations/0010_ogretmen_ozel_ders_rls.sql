-- Ogretmen/moderator/admin, henuz kimseye atanmamis (tutor_id null) bir ozel
-- ders talebini "ustlenebilsin" diye - eski politika sadece talebin sahibi
-- (ogrenci) veya zaten atanmis ogretmene izin veriyordu.
create policy tutor_referrals_teacher_manage on tutor_referrals
  for all
  using (current_role_name() in ('teacher', 'moderator', 'admin'))
  with check (current_role_name() in ('teacher', 'moderator', 'admin'));
