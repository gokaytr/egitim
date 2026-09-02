@AGENTS.md

## Dil kuralı

Bu proje üzerinde çalışırken tüm yazışmalar, açıklamalar ve yanıtlar Türkçe olmalı. Karışık Türkçe-İngilizce (kod içindeki değişken/fonksiyon isimleri hariç) kullanılmamalı — sohbet, özet ve açıklama metinleri tamamen Türkçe olsun.

## Git kuralı

**GÜNCELLENDİ**: Çalıştığım bulut ortamındaki depo ile kullanıcının Windows bilgisayarındaki depo birbirinden bağımsız iki ayrı klondur — ikisi de aynı GitHub deposuna (origin) bağlı ama birbirlerinin commit'lerini otomatik görmezler. Eskiden "push'u her zaman kullanıcı yapar" kuralı vardı, ama bu kullanıcının kendi bilgisayarındaki depoda benim commit'lerimin hiç bulunmaması nedeniyle işe yaramıyordu (kullanıcı orada push çalıştırınca "Everything up-to-date" görüyordu, çünkü benim commit'lerim sadece buradaydı). Kullanıcıyla konuşulup karar verildi: artık değişiklikler temizse (tsc hatasız geçtiyse) commit'ledikten SONRA `git push origin main`'i BURADAN (bulut ortamından) doğrudan ben çalıştırıyorum. Kullanıcı sonra kendi bilgisayarında `git pull origin main` çalıştırarak güncel hâli alıyor. Push başarısız olursa (ör. "fetch first"/"Updates were rejected") panik yapmadan `git fetch origin` + `git merge origin/main` ile birleştirip tekrar push deniyorum.

## Yanıt ve commit kuralı

Sohbet yanıtlarında kod bloğu/kod parçası gösterme — yapılan değişiklikleri sade Türkçe cümlelerle özetle, kod yapıştırmana gerek yok.

Değişiklikler temizse (tsc hatasız geçtiyse) commit etmeden önce izin sorma — otomatik commit et, ardından yukarıdaki Git kuralı gereği `git push origin main`'i de kendim çalıştırıp sonucu (başarılı push / karşılaşılan sorun) kısaca özetle. Artık kullanıcıya çalıştırması gereken bir push komutu vermeme gerek yok.

Stop hook "unpushed commit" uyarısı geldiğinde: önce buradan `git push origin main` çalıştırmayı dene (fetch/merge gerekiyorsa yap), başarılı olursa kısaca "push edildi" de; gerçekten çözülemeyen bir sorun varsa kısaca özetle.

## Dosya paylaşım kuralı

Bir kod dosyasını değiştirip `git add` + `git commit` ile depoya işlediysem, o dosyayı SendUserFile (veya benzeri "sohbete dosya gönder") aracıyla ayrıca kullanıcıya gönderme — hiçbir amaçla, cihaza (device bridge) yazmak için bile. Bu araç sohbette görünür bir dosya kartı bırakıyor ve kullanıcı bunu istemiyor. Sohbette sadece değişikliklerin sade Türkçe özetini ve gerekiyorsa `git push origin main` komutunu ver. SendUserFile'ı yalnızca kullanıcının doğrudan "bana bir dosya olarak ver/indir" dediği, depoya commit edilmeyen (rapor, döküm, dışa aktarım vb.) çıktılar için kullanabilirsin.

Bu nedenle artık cihazdaki (Windows bilgisayarındaki) depoyu benim proaktif olarak güncellemem beklenmiyor — sadece bulut ortamında (cloud sandbox) çalışıp commit'liyorum, kullanıcı push ettikten sonra kendi bilgisayarında (VS Code/terminal) `git pull origin main` çalıştırarak güncel hâli alıyor. Kullanıcı açıkça "cihazımı da güncelle" derse, o zaman device_bash ile doğrudan cihazda küçük komutlarla (sed/python read-modify-write, dosya bulunuyorsa küçük heredoc) düzenleme yapmayı dene; SendUserFile'a yine başvurma.

## Ortak çalışma (başka bir geliştirici de bu repoda çalışıyor) kuralı

Bu depoda benimle birlikte başka bir geliştirici de bağımsız olarak çalışıyor ve doğrudan `main` dalına push yapabiliyor (GitHub üzerinde pull request onayı istenmeden). Bu yüzden:

- Herhangi bir değişikliğe başlamadan önce, o oturumda ilk kez kod üzerinde çalışacaksam önce `git fetch origin` + `git merge origin/main` (ya da çakışma yoksa fast-forward `git pull`) çalıştırıp diğer geliştiricinin daha önce push ettiği değişiklikleri otomatik olarak çekmeliyim — bunu kullanıcıya sormadan, işe başlarken kendiliğinden yapmalıyım. Bu artık sadece bulut ortamında (cloud sandbox) gerekiyor — cihazdaki (device bridge) depoyu güncel tutmak kullanıcının kendi sorumluluğu (bkz. "Dosya paylaşım kuralı").
- `git push origin main` reddedilirse ("fetch first" / "Updates were rejected") bunun nedeni genelde diğer geliştiricinin arada push yapmış olmasıdır — panik yapmadan `git fetch` + `git merge origin/main` ile birleştirip tekrar push komutunu vermeliyim.
- GitHub deposunun `main` dalında bir "pull request zorunlu" (branch protection / required review) ayarı olup olmadığını bu ortamdan (API erişimi kısıtlı olduğu için) doğrudan kontrol edemiyorum; bu tür bir ayar sorusu gelirse kullanıcıyı GitHub'daki Settings → Branches → main dalı kuralları ekranına yönlendirmeliyim.

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
