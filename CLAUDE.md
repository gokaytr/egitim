@AGENTS.md

## Dil kuralı

Bu proje üzerinde çalışırken tüm yazışmalar, açıklamalar ve yanıtlar Türkçe olmalı. Karışık Türkçe-İngilizce (kod içindeki değişken/fonksiyon isimleri hariç) kullanılmamalı — sohbet, özet ve açıklama metinleri tamamen Türkçe olsun.

## Git kuralı

**GÜNCELLENDİ (2. kez)**: Çalıştığım bulut ortamındaki depo ile kullanıcının Windows bilgisayarındaki depo birbirinden bağımsız iki ayrı klondur — ikisi de aynı GitHub deposuna (origin) bağlı ama birbirlerinin commit'lerini otomatik görmezler.

Denenip ELENEN yöntem: "Bulut ortamından doğrudan `git push origin main` ben çalıştırırım" — bu ÇALIŞMIYOR. Bulut ortamındaki git-proxy, bu depoyu (`gokaytr/egitim`) push için yetkili depo listesinde tutmuyor ve her denemede 403 ("access denied by the git proxy") ile reddediyor. Bu bir CLAUDE.md kuralı değil, altyapısal bir kısıtlama — atlatılamaz, tekrar tekrar denemenin anlamı yok.

Ayrıca cihaz köprüsü (device_bash) üzerinden de push ÇALIŞMIYOR: device_bash, kullanıcının Windows'undaki gerçek git kimlik bilgilerine (Credential Manager) erişemeyen ayrı bir Linux VM'de çalışıyor; oradan push denemesi "could not read Username" gibi hatalarla başarısız oluyor.

**Gerçek çalışan mekanizma**: Bulut ortamında değişiklikleri commit'liyorum (push ETMİYORUM, zaten edemiyorum). Kullanıcı stop-hook uyarısı gördüğünde veya push isteğinde bulunduğunda, şu adımları uyguluyorum:
1. `git diff origin/main..HEAD > /tmp/xxx.patch` ile bulut deposundaki tüm birikmiş farkı tek bir patch dosyasında topluyorum, `sha256sum` ile hash'ini not ediyorum.
2. `SendUserFile` ile bu patch dosyasını gönderip `file_uuid` alıyorum (bu, "Dosya paylaşım kuralı"ndaki committed-kod-dosyası yasağının kapsamına GİRMEZ — bu bir senkronizasyon mekanizması, kalıcı bir teslimat değil).
3. `mcp__remote-devices__device_commit_files` ile patch dosyasını cihazdaki depo klasörünün köküne (örn. `_sync_full.patch`) yazıyorum.
4. `device_bash` ile: `sha256sum` doğrulaması → `git apply --check` → `git apply` → patch dosyasını sil → `git add -A` → `git commit` (aynı Co-Authored-By/Claude-Session imzasıyla).
5. Push'u BEN yapamadığım için, son adımda kullanıcıya kendi bilgisayarında (PowerShell/terminal, device_bash DEĞİL) `git push origin main` çalıştırmasını söylüyorum — bu adım için kullanıcıdan bir şey istemek zorunludur, atlanamaz.

Bu akışı SADECE stop-hook uyarısı geldiğinde veya kullanıcı push/senkron istediğinde çalıştırıyorum, her küçük commit'te değil (gereksiz patch trafiği kullanıcıyı yormasın diye birikmiş commit'leri toplu senkronluyorum).

## Yanıt ve commit kuralı

Sohbet yanıtlarında kod bloğu/kod parçası gösterme — yapılan değişiklikleri sade Türkçe cümlelerle özetle, kod yapıştırmana gerek yok.

Değişiklikler temizse (tsc hatasız geçtiyse) commit etmeden önce izin sorma — otomatik commit et. Push konusunda yukarıdaki Git kuralı geçerli: bulut ortamından push edemediğim için, her commit'te push denemem gerekmiyor; stop-hook uyarısı geldiğinde veya kullanıcı isteyince yukarıdaki patch-senkron akışını uygulayıp en sonda kullanıcıya kendi bilgisayarında çalıştırması için TEK bir `git push origin main` komutu veriyorum.

Stop hook "unpushed commit" uyarısı geldiğinde: BURADAN `git push origin main` çalıştırmayı DENEME (403 ile başarısız olacağı zaten biliniyor) — doğrudan patch-senkron akışını (yukarıdaki Git kuralı) uygula ve sonunda kullanıcıdan push'u kendi bilgisayarında çalıştırmasını iste.

## Dosya paylaşım kuralı

Bir kod dosyasını değiştirip `git add` + `git commit` ile depoya işlediysem, o dosyayı SendUserFile (veya benzeri "sohbete dosya gönder") aracıyla ayrıca, TEK BAŞINA bir teslimat olarak kullanıcıya gönderme — sohbette görünür gereksiz dosya kartları bırakmasın. Sohbette sadece değişikliklerin sade Türkçe özetini ver.

İstisna: yukarıdaki "Git kuralı"nda tarif edilen patch-senkron mekanizması. Orada SendUserFile + `device_commit_files`, bulut deposundaki commit'leri kullanıcının cihazındaki depoya aktarmanın TEK çalışan yöntemi (base64/metin içine gömerek aktarım denendi, büyük blob'larda sessiz bozulmaya yol açtığı için GÜVENİLMEZ bulundu — patch dosyası + hash doğrulama + `git apply`'ın kendiliğinden hata vermesi güvenli olan yöntem). Bu kullanım "dosya teslimatı" değil "senkronizasyon" olduğu için bu kuralın yasağına girmiyor; patch dosyası cihazda uygulanır uygulanmaz silinir, kalıcı bir dosya olarak kalmaz.

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
