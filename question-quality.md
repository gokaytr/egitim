# Soru Kalite Kontrolü — Otomatik Puanlama ve Ret Sistemi

Bu dosya, **sadece soru üretimi/ayrıştırma ile ilgili kod üzerinde çalışırken** okunur (bkz. `question-generation.md`'nin başındaki not — aynı kural burada da geçerli). Burada tarif edilen eşik ve alanlar, `src/lib/ai/anthropic.ts`'deki `generateQuestions()` (ve mümkün olduğunca `parseExamText()`) tarafından fiilen uygulanmalı: bu bir "iyi niyet temennisi" değil, kodun uyması gereken bir sözleşmedir.

## 1. Neden gerekli

Sistem onbinlerce soru üretebilecek ölçeğe çıktıkça, her soruyu ayrı ayrı bir insanın (öğretmen/admin) elle elemesi pratik olmaktan çıkar. Bu yüzden düşük kaliteli/hatalı sorular veritabanına HİÇ girmeden, üretim sırasında elenmelidir. Bu, `CLAUDE.md`'deki "Soru Onayı" akışının (öğretmen/admin incelemesi) YERİNE geçmez — onu TAMAMLAR: kalite kontrolü kaba/bariz hatalı soruları en baştan eler, kalan sorular yine öğretmen/admin onayından geçer.

## 2. Puanlama rubriği (100 üzerinden)

Yapay zeka, ürettiği HER soruyu döndürmeden önce kendi içinde bu rubriğe göre değerlendirir ve sonucu `quality_score` alanında döndürür:

- **Özgünlük — 20 puan:** Bilinen bir sınav sorusunun/senaryonun değiştirilmiş hali değil mi? Daha önceki (aynı istekteki diğer) sorulara fazla mı benziyor?
- **Ölçme değeri — 20 puan:** Soru gerçekten belirtilen kazanımı/beceriyi ölçüyor mu, yoksa alakasız/anlamsız mı?
- **Müfredata uygunluk — 15 puan:** İçerik, belirtilen konu/kazanımın (ve sınıf seviyesinin) gerçekten içinde mi?
- **Seviye uygunluğu — 10 puan:** Belirtilen sınıf/zorluk kademesine göre çok kolay ya da çok zor değil mi?
- **Çeldirici kalitesi — 10 puan:** Yanlış şıklar gerçekçi bir öğrenci hatasını mı yansıtıyor, yoksa rastgele/saçma mı?
- **Dil ve anlatım — 10 puan:** Türkçe dil bilgisi doğru mu, anlatım doğal mı, belirsizlik/gereksiz uzunluk var mı?
- **Çözüm doğruluğu — 10 puan:** Doğru cevap gerçekten doğru mu, diğer üç şık kesinlikle yanlış mı, `explanation` bu mantığı doğru anlatıyor mu?
- **Soru formatı/çeşitlilik — 5 puan:** Set içindeki diğer sorularla aynı kalıbı (ör. hep "Buna göre aşağıdakilerden hangisi...") tekrar mı ediyor?

## 3. Kabul eşiği

- **90–100:** Mükemmel → doğrudan kabul.
- **80–89:** İyi → kabul (küçük kusurlar öğretmen onayında yakalanabilir).
- **70–79:** Orta → **reddedilir**, sete dahil edilmez.
- **0–69:** Yetersiz → **reddedilir**, sete dahil edilmez.

**Eşik: 80.** `quality_score < 80` olan bir taslak, öğretmenin/admin'in önüne bile gelmeden elenir — veritabanına yazılmaz.

Bu proje bunu şöyle uygular (ek bir API çağrısı/gecikme yaratmadan, aynı üretim isteği içinde): AI, JSON çıktısındaki her soru nesnesine `quality_score` alanını da ekler; `src/app/api/ai/generate-questions/route.ts` bu alanı okuyup 80'in altındaki taslakları veritabanına yazmadan filtreler. Bu bir savunma katmanıdır — AI'nin kendi puanlamasına güvenilir ama sunucu tarafında da tekrar kontrol edilir.

## 4. Otomatik ret gerektiren mutlak kurallar

Puan ne olursa olsun, aşağıdaki durumlardan biri varsa soru ASLA kabul edilmez:

- iki (veya sıfır) doğru cevabı olan,
- eksik/çelişkili bilgi içeren,
- matematiksel veya bilimsel olarak hatalı,
- tarihsel olarak hatalı (anakronizm dahil),
- dil açısından belirsiz/çok anlamlı olan,
- `explanation` (çözüm açıklaması) boş olan — bkz. `CLAUDE.md` "Soru cevap açıklaması kuralı", bu zaten ayrı bir sunucu-taraflı filtre olarak uygulanıyor.

Şüphe varsa soru yayınlanmaz, elenir.

## 5. Soru başına toplanan ek metadata (varsa)

Mümkün olduğunda AI, `quality_score`'un yanında şu alanları da döndürür (ileride kişiselleştirilmiş/adaptif test ve zayıf-konu analizi için kullanılabilir — bkz. `question-generation.md` §3):

- `cognitive_level` — Hatırlama / Anlama / Uygulama / Analiz / Değerlendirme / Üst düzey düşünme
- `question_type` — soru tipi (paragraf, problem çözme, tablo yorumlama, vb. — bkz. `question-generation.md` §3.3)

Bu alanlar veritabanında saklanabiliyorsa (`questions.quality_score`, `questions.cognitive_level`, `questions.question_type` gibi nullable kolonlar) ilerideki analiz özellikleri için faydalıdır; saklanamıyorsa bile üretim sırasındaki filtreleme için kullanılır.

## 6. Toplu üretimde ek kontrol

Bir seferde birden fazla soru istendiğinde, AI'den ayrıca şunu döndürmesi istenir: setin genelinde doğru cevap harfi (A/B/C/D) dağılımı dengeli mi, aynı soru kökü/kalıp aşırı tekrar ediyor mu. Aşırı tekrar tespit edilirse ilgili sorular da elenmeli/yeniden kurgulanmalıdır.
