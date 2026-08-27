-- Örnek müfredat verisi (başlangıç için lise matematik - genişletilecek)
insert into subjects (id, name, category) values
  ('11111111-1111-1111-1111-111111111111', 'Matematik', 'lise'),
  ('22222222-2222-2222-2222-222222222222', 'Türkçe', 'lise'),
  ('33333333-3333-3333-3333-333333333333', 'Fizik', 'lise')
on conflict do nothing;

insert into topics (subject_id, name, grade_level, exam_types, difficulty_level, estimated_minutes, order_index) values
  ('11111111-1111-1111-1111-111111111111', 'Fonksiyonlar', 10, '{TYT,AYT}', 3, 90, 1),
  ('11111111-1111-1111-1111-111111111111', 'Türev', 12, '{AYT}', 5, 180, 2),
  ('11111111-1111-1111-1111-111111111111', 'İntegral', 12, '{AYT}', 5, 180, 3),
  ('11111111-1111-1111-1111-111111111111', 'Problemler', 9, '{TYT,LGS}', 3, 120, 4),
  ('22222222-2222-2222-2222-222222222222', 'Paragrafta Anlam', 9, '{TYT,LGS}', 2, 90, 1),
  ('33333333-3333-3333-3333-333333333333', 'Kuvvet ve Hareket', 9, '{TYT,AYT}', 3, 120, 1)
on conflict do nothing;
