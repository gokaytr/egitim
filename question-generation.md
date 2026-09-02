# Soru Hazırlama Kuralı — Teknik Üretim Algoritması

Bu dosya, **sadece soru üretimi/ayrıştırma ile ilgili kod üzerinde çalışırken** (ör. `src/lib/ai/anthropic.ts` içindeki `generateQuestions`/`parseExamText`, veya soru kalite kontrolü) okunur — genel proje/git kuralları için `CLAUDE.md`'ye bakılır. Bu dosyanın içeriği, uygulamanın kendi yapay zeka soru üretim sistem prompt'larına da yansıtılmalıdır (bir kural burada değişirse, ilgili sistem prompt'u da güncellenmelidir) — burası sadece insan için okunan bir doküman değil, üretimi fiilen yönlendiren kaynaktır.

Kalite kontrol eşiği ve otomatik puanlama kuralları için `question-quality.md`'ye bakın.

## 1. Amaç

Sistemin amacı çok sayıda soru üretmek değil; özgün, kaliteli, ölçme değeri yüksek, pedagojik olarak doğru, seviyeye uygun, anlaşılır, güvenilir, tekrar etmeyen, gerçek bir öğretmen/ölçme-değerlendirme uzmanı tarafından hazırlanmış hissi veren sorular üretmektir.

Yapay zeka soru üretirken yalnızca "metin oluşturan bir sistem" gibi değil, aynı zamanda deneyimli öğretmen, ölçme-değerlendirme uzmanı, sınav soru yazarı, editör ve kalite kontrol uzmanı gibi davranmalıdır.

**KALİTE > MİKTAR.** Çok sayıda düşük kaliteli soru üretmek tercih edilmez. Kalite ile sayı arasında seçim yapmak gerekirse her zaman kalite tercih edilir.

## 2. Sistemin kapsadığı seviyeler

Bu proje 1–12. sınıf okul müfredatını ve şu merkezi sınavları kapsar: **LGS, TYT, AYT, KPSS, ALES** (bkz. `src/lib/homepage-content.ts` → `EXAM_COURSES`, `topics.exam_types`). Soru üretmeden önce sınav türü ve öğrenci seviyesi (`grade_level`) mutlaka dikkate alınmalıdır.

## 3. Soru üretim protokolü (zihinsel sıralama)

Her soru şu sırayla tasarlanmalı — bu sıralama tamamlanmadan soru "hazır" sayılmaz:

1. **Kazanım belirle** — ders, sınıf/sınav, konu, alt konu, ölçülmek istenen bilgi/beceri. Kazanım belirsizse doğrudan soru yazma (sistemde bu, `topics.kazanim` alanına ve konu adına karşılık gelir).
2. **Bilişsel düzeyi belirle** — Hatırlama / Anlama / Uygulama / Analiz / Değerlendirme / Üst düzey düşünme. Her soru üst düzey olmak zorunda değil, ama özellikle ortaokul, lise ve merkezi sınavlarda test sadece ezber sorularından oluşmamalı.
3. **Soru tipini belirle** — doğrudan bilgi, yorumlama, çıkarım, problem çözme, karşılaştırma, neden-sonuç, tablo/grafik yorumlama, deney, günlük yaşam, paragraf, mantıksal akıl yürütme, çok aşamalı problem, veri analizi. Aynı sette aynı formatı art arda tekrarlama.
4. **Özgün bağlam/senaryo oluştur** — gerçekçi, anlaşılır, konuya hizmet eden, gereksiz ayrıntıdan arındırılmış. Sırf zor göstermek için gereksiz uzun senaryo kurma.
5. **Soru kökünü yaz** — açık, tek anlamlı, dilbilgisi açısından doğru, seviyeye uygun, ölçmek istediği beceriyi gerçekten ölçen. Her soru "Buna göre aşağıdakilerden hangisi..." kalıbıyla başlamamalı — uygun olduğunda farklı soru kökleri kullan (ama yapay/anlamsız çeşitlilik de kurma).
6. **Çeldiricileri tasarla** — sistemde 4 şık var (A–D), bir doğru + üç makul çeldirici. Çeldiriciler rastgele değil, gerçek bir öğrenci hatasına dayanmalı: kavram yanılgısı, işlem hatası, yanlış çıkarım, eksik bilgi, yanlış sıralama, dikkat hatası. Bu proje `option_error_tags` alanında her yanlış şıkkın hangi hatayı temsil ettiğini adlandırır — açıkça saçma/komik seçenek kullanılmaz.
7. **Çözümü/açıklamayı yaz** — bkz. `CLAUDE.md` "Soru cevap açıklaması kuralı": her sorunun `explanation` alanı zorunlu, sadece "Doğru cevap C'dir" yeterli değil; doğru cevabın neden doğru olduğunu, hangi bilginin kullanıldığını, gerekiyorsa adım adım çözümü göstermeli.
8. **Doğruluk kontrolü** — veriler kontrol edilir, işlem/çözüm tekrar yapılır, doğru şık doğrulanır, diğer üç şıkkın kesinlikle yanlış olduğu teyit edilir. Matematiksel/bilimsel olarak belirsiz veya birden fazla doğru cevabı olabilecek soru üretilmez.
9. **Özgünlük kontrolü** — bkz. §6 (telif) ve `question-quality.md`.

## 4. ÖSYM tarzı için temel kural

ÖSYM tarzı "uzun ve karmaşık soru yazmak" anlamına gelmez. Referans alınabilecek özellikler: bilgiyi kullanma, yorumlama, çıkarım yapma, problem çözme, verilen bilgiler arasında ilişki kurma, dikkatli okuma, kavramları ayırt etme, bilgiyi yeni bir durumda uygulama.

Amaç ÖSYM'nin sorusunu taklit etmek değil, **ÖSYM seviyesinde ölçme kalitesine sahip özgün sorular üretmektir.**

## 5. Telif ve özgünlük — zorunlu sınır

Her soru sıfırdan tasarlanır. Aşağıdakiler kesinlikle yasaktır:

- internetten/kitaptan soru kopyalamak,
- mevcut bir sınav sorusunu değiştirerek yeniden yazmak (sayıları değiştirmek, paraphrase etmek, seçenekleri değiştirmek, senaryoyu küçük değişikliklerle tekrar kurmak dahil).

Soru Havuzu'ndaki (`is_reference_only=true`) gerçek geçmiş sınav soruları **yalnızca ölçme yaklaşımı/tarz/zorluk referansı** olarak kullanılır — metni, senaryosu veya seçenek yapısı asla taklit edilmez, birebir kopyalanmaz. Bu proje politikası zaten `generateQuestions()`'daki `referenceBlock`'ta uygulanıyor; yeni bir değişiklik bu sınırı gevşetmemeli.

## 6. Seviyeye göre üslup

- **1–4. sınıf:** yaşa uygun kelimeler, kısa cümleler, somut örnekler, günlük yaşam, temel kavramlar. Akademik dil ya da soruyu zorlaştırmak için uzun metin kullanılmaz.
- **5–8. sınıf:** yorumlama, problem çözme, tablo/grafik, deney, günlük yaşam, neden-sonuç, çıkarım daha fazla kullanılabilir; 8. sınıfta (LGS) sınav odaklı düşünme becerisi artırılabilir.
- **9–12. sınıf / TYT / AYT:** konu bilgisi, analiz, yorumlama, uygulama, çıkarım, çok aşamalı düşünme öne çıkar — ama akademik zorluk müfredat dışına taşmaz.
- **TYT:** temel yeterlilik, yorumlama, problem çözme, günlük yaşam, veri okuma, mantıksal çıkarım — özellikle Matematik ve Türkçe'de salt ezber bilgi ölçülmez.
- **AYT:** ilgili alanın akademik derinliği korunur — konu bilgisi, kavramlar arası ilişki, analiz, uygulama, ileri düzey yorumlama.
- **KPSS:** bilgi, kavram, tarihsel ilişki, neden-sonuç, yorumlama, mevzuat/coğrafya/vatandaşlık bilgisi dengeli kullanılır; güncel bilgi doğrulanmadan kesin ifade olarak kullanılmaz.
- **ALES:** sözel/sayısal akıl yürütme, ilişki kurma, mantık, tablo, sıralama, problem çözme öne çıkar; gereksiz ezber bilgi kullanılmaz.

## 7. Derse özel kurallar

- **Türkçe / Türk Dili ve Edebiyatı:** paragraf, ana düşünce, yardımcı düşünce, çıkarım, yazarın tutumu, sözcük/cümle anlamı, cümleler arası ilişki, dil bilgisi, yazım, noktalama. Paragraf metni doğal ve anlamlı olmalı — sadece soru üretmek için anlamsız cümleler bir araya getirilmez.
- **Matematik / Geometri / Fizik / Kimya / Fen Bilimleri (sayısal dersler):** ÖSYM'deki gibi kısa bir günlük hayat/gerçek dünya senaryosu içinde sunulur, soyut/kuru işlem sorusu (ör. "2x+5=17 ise x kaçtır?") varsayılan değildir — bu proje `generateQuestions()`'da zaten uygulanıyor (bkz. `NUMERIC_SUBJECTS`). Matematik sorularında: veriler kontrol edilir → işlem yapılır → sonuç tekrar hesaplanır → doğru şık doğrulanır → çeldiriciler kontrol edilir.
- **Fen Bilimleri:** deney, gözlem, değişken, hipotez, sonuç, grafik, tablo kullanılabilir; bilimsel olarak yanlış bilgi kullanılmaz.
- **Tarih:** kronoloji, neden-sonuç, siyasi/ekonomik/sosyal gelişmeler doğru ilişkilendirilir; anakronizm yapılmaz.
- **Coğrafya:** harita, grafik, iklim, nüfus, ekonomi, yer şekilleri, doğal kaynaklar, beşerî coğrafya kullanılabilir; coğrafi verilerin doğruluğu kontrol edilir.
- **Felsefe:** kavram bilgisi, düşünce analizi, görüş karşılaştırması, çıkarım; bir filozofa ait olmayan görüş ona aitmiş gibi gösterilmez.

## 8. Şık (çeldirici) tasarımı — genel kural

- 4 şık (A–D), tek doğru cevap.
- Şıklar mümkün olduğunca benzer uzunlukta, aynı dilbilgisel yapıda, karşılaştırılabilir olmalı.
- Doğru cevap sistematik olarak en uzun/en kısa şık ya da hep aynı harf (ör. hep C) olmamalı — doğru cevap harfinin dağılımı bir soru setinde dengeli ve tahmin edilemez olmalı.

## 9. Grafik/tablo içeren sorular

Bu sistem, gerçek bir görsel/fotoğraf/harita GEREKTİREN — yani metne dökülemeyen — soru üretmez (bkz. sistem prompt kural 6). Ama ÖSYM'nin gerçek sorularında olduğu gibi, pasta/çubuk grafiğin dilimleri, bir tablonun satır/sütunları, bir oda-koridor/kat düzeninin numaralandırması, bir yarışma/sıralama tablosu gibi veriler TAMAMEN METİNLE (gerekirse madde işaretli liste veya metin-tablo halinde) eksiksiz ve tutarlı biçimde betimlenebiliyorsa, bu tür "veriyi sözel temsille aktaran" sorular YAZILMALIDIR — bu, ÖSYM tarzının ayırt edici bir parçasıdır, kaçınılması gereken bir şey değildir. Metin içi tablo/veri kullanılıyorsa: veriler tutarlı olmalı, soruyla uyuşmalı, cevap gerçekten o veriden çıkarılabilmeli, gereksiz veri bulunmamalı.

## 11. Uzunluk ve çok adımlılık — TYT/AYT/YKS ve merkezi sınavlar için

Kullanıcı geri bildirimiyle netleşen bir kural: ÖSYM'nin gerçek TYT/AYT/YKS sorularının büyük çoğunluğu KISA/TEK ADIMLI değildir. Soru kökü genelde birkaç cümle sürer, birden fazla veri/koşul/kişi/nesne içerir (ör. iki ayrı olayın/kişinin karşılaştırılması, bir oran zincirinden geçilmesi, önce bir ara değerin bulunup sonra asıl sorunun cevaplanması) ve çözüm EN AZ İKİ işlem adımı gerektirir. "Orta", "zor" ve "çok zor" zorluk kademesinde, özellikle TYT/AYT/YKS sınav türü için ve sayısal derslerde (Matematik, Geometri, Fizik, Kimya): tek cümlelik, tek işlemli, kısa bir soru kökü YETERSİZ sayılır — bunun yerine yukarıdaki gibi çok adımlı, veri-zengin bir kurgu tercih edilmelidir. "Kolay" zorlukta ve alt sınıf seviyelerinde (1-8. sınıf) bu zorunlu değildir; oradaki kural hâlâ §6'daki seviyeye-göre-üslup ilkesidir.

## 10. Toplu üretim (bir seferde birden fazla soru)

Örneğin 10-40 soru istendiğinde tamamı aynı kalıpta olmamalı. Set içinde şunlar çeşitlendirilmeli: soru kökü, bağlam/senaryo, çözüm yöntemi, doğru cevap harfi dağılımı, mümkünse bilişsel düzey. Aynı tip sorular art arda gelmemeli.
