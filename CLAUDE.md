@AGENTS.md

## Dil kuralı

Bu proje üzerinde çalışırken tüm yazışmalar, açıklamalar ve yanıtlar Türkçe olmalı. Karışık Türkçe-İngilizce (kod içindeki değişken/fonksiyon isimleri hariç) kullanılmamalı — sohbet, özet ve açıklama metinleri tamamen Türkçe olsun.

## Git kuralı

Değişiklikleri commit'leyebilirsin (kullanıcı onayladıysa), ama ASLA `git push` çalıştırma — push işlemini her zaman kullanıcının kendisi yapar.

## Yanıt ve commit kuralı

Sohbet yanıtlarında kod bloğu/kod parçası gösterme — yapılan değişiklikleri sade Türkçe cümlelerle özetle, kod yapıştırmana gerek yok.

Değişiklikler temizse (tsc hatasız geçtiyse) commit etmeden önce izin sorma — otomatik commit et, sonra bana çalıştırmam gereken `git push origin main` komutunu ver. Push'u ASLA sen çalıştırma.

## Admin önizleme paritesi kuralı

Öğrenci, öğretmen veya veli panelinde yeni bir özellik eklendiğinde, mevcut bir ekran değiştirildiğinde veya bir ayar/tercih sistemi kurulduğunda, bu değişiklik admin panelinden ilgili paneli önizlerken de (test öğrenci/test öğretmen/test veli seçiciyle) aynı şekilde ve güncel olarak görünmeli ve çalışmalıdır. Admin önizlemesi "neredeyse birebir" gerçek kullanıcı deneyimini yansıtmalı — sol menü hariç.

Pratikte bu şu anlama gelir:
- Bir sayfa `auth.uid()`/oturum açan kullanıcının kendi id'sini doğrudan kullanıyorsa (sorgularda, ayar okuma/yazmada), admin o sayfayı önizlerken bu id admin'in kendisi olur ve veriler yanlış/boş görünür. Bunun yerine `resolveEffectiveStudent()` (öğrenci), `resolveEffectiveTeacher()` (öğretmen) gibi zaten var olan "etkin kullanıcı" çözücüleri kullanılmalı, veli önizlemesi için benzer bir desen (`parent_student_links` üzerinden) izlenmeli.
- Öğrenci/öğretmen/veli tarafından yazılabilen yeni bir ayar (tercih) tablosu eklenirse, RLS politikaları sadece o kullanıcının kendi satırını değil, admin'in de (önizleme sırasında o kullanıcı adına) okuyup yazabilmesine izin vermeli.
- Yeni bir sekme/form/gösterge eklerken, "bu sadece gerçek kullanıcı girişinde mi görünüyor, yoksa admin önizlemesinde de mi?" sorusu her seferinde kontrol edilmeli — varsayılan olarak admin önizlemesinde de görünmesi ve işlevsel olması beklenir.
- Bir özellik gerçekten sadece gerçek hesapta anlamlıysa (ör. şifre değiştirme), bu bir istisna olarak kabul edilebilir, ama varsayılan davranış "admin önizlemede de aynısını gör" olmalı.

## Soru cevap açıklaması kuralı

Sistemdeki HER soru, sadece doğru şıkkın harfini (`correct_option`) değil, doğru cevabın NEDEN doğru olduğunu açıklayan ayrı bir metni (`questions.explanation`) de içermek zorundadır. Bu, projenin ana kurallarından biridir ve şu şekilde uygulanır:

- Yeni bir soru elle, toplu (kopyala-yapıştır/dosya) veya yapay zeka ile eklenirken açıklama alanı zorunludur — boş bırakılamaz. Formlarda "opsiyonel" ibaresi kullanılmaz.
- Öğrenci bir deneme veya konu testini bitirdiğinde, özellikle bilemediği/yanlış yaptığı sorularda "doğru cevap bu şıktı ve bu yüzden doğruydu" şeklinde bu açıklama kendisine gösterilir — sadece doğru şıkkın hangisi olduğu değil, çözümün mantığı da görünür olmalı.
- Öğrenci bir konudaki soruları çözmeden önce/sonra "Cevaplar" (cevap anahtarı) ekranından baktığında da her sorunun açıklaması görünür.
- Mevcut tüm sorular (Matematik dahil tüm dersler) bu kurala göre güncellenmiş, açıklaması eksik soru kalmamıştır. Yeni eklenen her soru da bu standarda uymalıdır — açıklaması olmayan bir soru onaylanmış/öğrenciye gösterilmiş sayılmamalıdır.
