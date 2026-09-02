-- ============================================================================
-- Admin panelindeki yeni "Planlama" ekrani icin: her konunun ne kadar soru
-- icermesi hedeflendigini (ör. "KPSS Turkce - Sozcukte Anlam: 60 soru")
-- tutan tek bir nullable kolon. NULL ise arayuz varsayilan bir hedef
-- (DEFAULT_TARGET_PER_TOPIC, bkz. src/components/planning-board.tsx)
-- gosterir - admin bu degeri konu bazinda degistirebilir, degistirdiginde
-- burada saklanir. Ayri bir tablo yerine dogrudan topics'e eklendi cunku
-- hedef zaten konu basina tek bir sayi, ekstra join'e gerek yok; ilerleme
-- (kac soru eklendi) ise questions tablosundan (topic_id, difficulty ile
-- gruplanarak) her seferinde canli hesaplaniyor, ayrica saklanmiyor.
-- ============================================================================

alter table topics add column if not exists target_question_count integer check (target_question_count is null or target_question_count >= 0);

comment on column topics.target_question_count is 'Admin Planlama ekraninda bu konu icin belirlenen hedef soru sayisi. NULL ise arayuzde varsayilan bir hedef gosterilir (bkz. planning-board.tsx DEFAULT_TARGET_PER_TOPIC).';
