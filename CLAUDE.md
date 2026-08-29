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
