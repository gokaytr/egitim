// Bu dosya Odak platformunun "sistem nasıl işliyor" dokümantasyonunun tek
// kaynağıdır. /admin/sistem-bilgisi ve /ogretmen/nasil-calisir sayfaları
// buradan besleniyor. Yeni bir özellik eklendiğinde ilgili bölüme birkaç
// cümle eklemek yeterli - ayrı bir dokümantasyon güncellemesi gerekmiyor.

export type DocItem = { title: string; body: string };
export type DocSection = { role: "admin" | "teacher" | "parent" | "student"; heading: string; items: DocItem[] };

export const DOC_SECTIONS: DocSection[] = [
  {
    role: "admin",
    heading: "Yönetici (Admin)",
    items: [
      {
        title: "Kullanıcı yönetimi",
        body: "Kullanıcılar sekmesinden tüm hesapları görebilir, rollerini değiştirebilirsin. Öğretmen başvuruları ayrı bir sekmede onay bekler; onaylanan hesap otomatik olarak 'teacher' rolüne geçer. Aynı sayfadaki Öğretmen Branş Atamaları tablosundan, hangi öğretmenin hangi derse (branşa) atandığını işaretleyebilirsin - bir öğretmen birden fazla branşa atanabilir. Atanan branşlar, o öğretmenin konu ekleme ve özel ders ekranlarında öne çıkar.",
      },
      {
        title: "Müfredat, sınıf ve kurs yönetimi",
        body: "Müfredat sekmesi önce sınıf düzeyine (1-12) göre gruplanır. Buradan yeni ders (Türkçe, Matematik, Kimya vb.) ekleyebilir, hangi sınıfa ait yeni bir konu oluşturabilir ve konuyu isteğe bağlı olarak bir veya birden fazla kursla (LGS, TYT, AYT, YKS, KPSS, ALES) etiketleyebilirsin. Yeni bir kurs eklemek de (örneğin 'YDT') aynı sekmeden yapılır. Aynı konu ekleme formu öğretmen panelinde de var; ders/kurs listesi yönetimi ise yalnızca admin panelinde.",
      },
      {
        title: "Soru ekleme",
        body: "Soru Ekle sekmesinde iki sekme var: ilk sekmede solda elle soru ekleme, sağda kopyala-yapıştır ya da PDF/Word dosyası yükleyerek toplu soru içe aktarma bulunur. İkinci sekme olan 'Yapay Zeka ile Soru Üret' henüz test aşamasında (Anthropic API kullanıyor, ücretli ve bazen hata verebiliyor) - üretilen sorular önce Soru Onayı sekmesinden onaylanmalı.",
      },
      {
        title: "Soru onayı",
        body: "Soru Onayı sekmesi, yapay zekanın ürettiği ve henüz onaylanmamış soruları listeler. Onaylamadan öğrenciye gösterilmezler. Aynı onay ekranı artık öğretmen panelinde de var, öğretmenler de bekleyen soruları onaylayıp reddedebilir.",
      },
      {
        title: "Veli bağlantıları",
        body: "Veli Bağlantıları sekmesinden hangi velinin hangi öğrenciyle ilişkilendirildiğini görebilir, yeni bağlantı ekleyip silebilirsin. Veliler ayrıca kendi ekranlarından öğrencinin e-postasıyla kendi kendilerine çocuk ekleyebilir.",
      },
      {
        title: "Önizleme ekranları",
        body: "Sayfanın sağ üstünde, Sistem Bilgisi ikonunun solunda sıralanan Üye Ekranı / Öğretmen Ekranı / Veli Görünümü bağlantılarına tıklayarak bu ekranları ayrı bir hesapla giriş yapmadan doğrudan önizleyebilirsin.",
      },
      {
        title: "Genel Ayarlar",
        body: "Genel Ayarlar sayfasından platform adı ve destek e-postası gibi temel bilgileri düzenleyebilirsin. Bakım modu anahtarı şimdilik yalnızca bilgi amaçlı, herhangi bir sayfayı otomatik kapatmıyor.",
      },
      {
        title: "Yapılacaklar (görev yönetimi)",
        body: "Sağ üstte, Sistem Bilgisi ikonunun solunda turuncu 'Yapılacaklar' bağlantısıyla açılan sayfa, yönetim ekibinin kendi iş takibi içindir. Her göreve Beklemede / Devam Ediyor / Tamamlandı durumu atanır, PDF veya Word dosyası eklenebilir (dosyalar özel bir depoda tutulur, sadece admin görebilir).",
      },
      {
        title: "Öğrenci Raporları",
        body: "Öğrenci Raporları sayfasından, veli önizlemesinden farklı olarak platformdaki TÜM öğrencilerden istediğini seçip; çalışma programını/hedeflerini, hangi soruları çözüp hangilerini çözmesi gerektiğini, geçmiş sınav/test sonuçlarını, konu anlatımı izleme geçmişini ve eksik analizlerini tek ekranda görebilirsin.",
      },
      {
        title: "Demo hesaplar",
        body: "Test amaçlı, aşağıda listelenen demo veli ve demo öğretmen hesapları platformda hazır bulunuyor. Öğrenci tarafında da 'reinvita' kullanıcı adıyla giren örnek bir öğrenci hesabı mevcut ve demo veliye bağlı.",
      },
    ],
  },
  {
    role: "teacher",
    heading: "Öğretmen",
    items: [
      {
        title: "Müfredat / Konu Ekle",
        body: "Müfredat / Konu Ekle sayfasından, önce sınıf (1-12) ve ders seçip yeni bir konu oluşturabilir, konuyu isteğe bağlı olarak LGS/TYT/AYT/YKS/KPSS/ALES gibi kurslarla etiketleyebilirsin. Yeni ders veya yeni kurs eklemek admin panelinden yapılır.",
      },
      {
        title: "Soru ekleme yöntemleri",
        body: "Soru Ekle sayfasında iki sekme var: ilk sekmede solda elle soru ekleme (soru metni, 4 şık, doğru cevap, opsiyonel görsel/açıklama), sağda kopyala-yapıştır ya da PDF/Word/TXT dosyası yükleyerek toplu soru içe aktarma bulunur - dosyadan metin otomatik çıkarılır, sistem soruları ayrıştırıp önizleme gösterir. İkinci sekme 'Yapay Zeka ile Soru Üret' henüz test aşamasında. Not: JPEG/taranmış görsellerden otomatik soru okuma şimdilik desteklenmiyor.",
      },
      {
        title: "Soru onayı",
        body: "Soru Onayı sayfasından, yapay zekanın ürettiği ve henüz onaylanmamış soruları onaylayabilir ya da reddedebilirsin.",
      },
      {
        title: "Konu anlatımı ekleme",
        body: "Konu Anlatımı sayfasından bir konuya başlık, metin içerik ve opsiyonel video bağlantısı ekleyebilirsin. Öğrenci bu içeriği konu sayfasını açtığında görür ve görüntüleme otomatik olarak kaydedilir (veli raporlarında 'izlenen konu anlatımı' sayısı bu kayıtlardan gelir).",
      },
      {
        title: "Görsel sorular ve çizim aracı",
        body: "Soruya görsel URL eklersen (örn. bir üçgen şekli), öğrenci quiz ekranında o görselin üzerine kalemle çizip silgiyle silebilir - örneğin bir kenara dik indirip uzunluk hesaplayabilir. Çizimler kaydedilmez, sadece öğrencinin çözüm sürecine yardımcı olur.",
      },
      {
        title: "Öğrenci bilgilendirmesi",
        body: "Bir öğrenci quiz'i bitirdiğinde, doğru/yanlış/boş sayıları ve hata etiketlerine (işlem hatası, kavram yanılgısı, dikkatsizlik, zaman yetersizliği) göre otomatik, ücretsiz bir kural tabanlı değerlendirme üretilir. Bu değerlendirme öğrenciye hangi kavramlara çalışması gerektiğini ve gerekiyorsa özel ders önerisini gösterir.",
      },
      {
        title: "Özel ders ihtiyacı ve programlama",
        body: "Bir talep, değerlendirme sonucu 'özel ders öner' çıktığında otomatik oluşabildiği gibi, veli de kendi ekranından öğrencisi için doğrudan özel ders talep edebilir. Tüm talepler Özel Ders sayfasında listelenir; bekleyen bir talebi 'Üstlen' diyerek onaylamış olursun, ardından tarih/saat, süre ve istersen kendi Google Meet/Zoom linkini girip dersi planlarsın. Planlanan ders hem senin 'Programım' listende hem öğrenci/velinin ekranında (canlı ders linkiyle birlikte) görünür. Ders gerçekleştikten sonra 'Tamamlandı' olarak işaretlenir.",
      },
      {
        title: "Branşın",
        body: "Admin sana bir veya birden fazla branş (ders) atadıysa, Genel Bakış sayfasının üstünde branşların listelenir. Konu Ekle ve Müfredat ekranlarındaki ders/konu seçimi otomatik olarak branşlarınla sınırlanır; Özel Ders ekranında da branşınla eşleşen talepler 'Branşın' etiketiyle öne çıkar.",
      },
      {
        title: "Öğrenci Raporları",
        body: "Öğrenci Raporları sayfasından platformdaki tüm öğrencilerden birini seçip; çalışma programını, geçmiş sınav sonuçlarını, konu anlatımı izleme geçmişini ve eksik analizlerini görebilirsin.",
      },
    ],
  },
  {
    role: "parent",
    heading: "Veli",
    items: [
      {
        title: "Raporlama ekranı",
        body: "Veli girişinde açılan 'Genel Durum' sayfası; öğrencinin ayrıntılı yazılı genel durum raporunu, özet istatistikleri ve en son 10 aktivitesini (tarih ve yaptığı işlemle birlikte) gösterir. Sol menüdeki 'Raporlama' sayfasında ise özel ders durumu, çalışma programı/hedefler, konu anlatımı izleme geçmişi ve eksikler/analiz geçmişi yer alır.",
      },
      {
        title: "Birden fazla öğrenci",
        body: "Bir veli hesabına birden fazla öğrenci bağlanabilir; ekranın üstündeki öğrenci seçiciden aralarında geçiş yapılabilir. Yeni bir çocuk eklemek için öğrencinin platformdaki e-posta adresini girmek yeterli.",
      },
      {
        title: "Özel ders talep etme",
        body: "Sol menüdeki ayrı 'Özel Ders Talebi' sayfasından, istersen bir konu seçerek doğrudan özel ders talebinde bulunabilirsin. Talep, ilgili konunun branşına atanmış öğretmenlerin Özel Ders ekranında 'Branşın' etiketiyle öne çıkarılmış şekilde, ayrıca admin panelinin Genel Bakış ekranındaki 'Bekleyen Özel Ders Talepleri' listesinde görünür. Henüz sonuçlanmamış bir talepten 'Vazgeç' diyerek her zaman geri çekilebilirsin. Bir öğretmen talebi üstlenip ders saatini planladığında, ders hem Genel Durum sayfasında 'Yaklaşan Özel Ders' olarak hem Özel Ders Talebi sayfasında canlı ders linkiyle (Google Meet/Zoom) birlikte görünür.",
      },
      {
        title: "Öğrenciye hedef atama",
        body: "Raporlama sayfasındaki Çalışma Programı / Hedefler kartından, bir konu seçip hedef soru sayısı ve süre belirleyerek öğrencine doğrudan hedef atayabilirsin (soru ata). Bu hedef, öğrencinin kendi ekranında 'Hedeflerim' olarak, doğrudan soru çözme sayfasına götüren bir bağlantıyla görünür.",
      },
      {
        title: "Seviye Tespit Sınavı ve otomatik program",
        body: "Öğrencin hiç soru çözmediyse Raporlama sayfasında bir 'Seviye Tespit Sınavı' kartı görünür - tek tıkla, sınıf seviyesine uygun farklı derslerden birkaç konuyu deneme amaçlı hedef olarak atar. Öğrenci bu konuların testlerini çözdükçe sistem otomatik eksik tespiti yapar; ardından 'Eksiklere Göre Otomatik Program Oluştur' butonuyla, çıkan eksiklere göre (önemli eksikte daha yüklü, hafif eksikte daha az soru/süre) yeni çalışma hedefleri otomatik eklenir.",
      },
      {
        title: "Geçmiş sınav sonuçları",
        body: "Raporlama sayfasındaki 'Geçmiş Sınav Sonuçları' kartından öğrencinin bugüne kadar çözdüğü her test/denemeyi, doğru/yanlış/boş sayılarıyla ve başarı yüzdesiyle görebilirsin.",
      },
    ],
  },
  {
    role: "student",
    heading: "Öğrenci",
    items: [
      {
        title: "Ders ve konu seçimi",
        body: "Öğrenci girişinde önce (varsa) velinin atadığı hedefler, ardından ders kartları (Türkçe, Matematik, Fen Bilimleri vb.), sonra o dersin konuları listelenir. Bir konuya girince varsa konu anlatımı, ardından o konunun soruları gösterilir. Öğrenci ekranında ayrıntılı raporlama gösterilmez - bu veli ve admin ekranlarına özeldir.",
      },
      {
        title: "Quiz ve değerlendirme",
        body: "Sorular çözüldükten sonra sonuç ekranı doğru/yanlış/boş sayıları ile birlikte, hatalardan yola çıkan detaylı bir kural tabanlı değerlendirme (hangi kavramlara çalışılmalı, ne yapılmalı) gösterir.",
      },
      {
        title: "Görsel sorularda çizim",
        body: "Görselli sorularda ekranı kağıt gibi kullanabilir; şeklin üzerine kalemle çizim yapıp silgiyle silebilirsin.",
      },
    ],
  },
];

export const DEMO_ACCOUNTS = [
  {
    role: "Veli (Parent)",
    email: "veli.demo@odak-egitim.com",
    password: "OdakVeli2026!",
    note: "Öğrenci 'reinvita' hesabına bağlıdır.",
  },
  {
    role: "Öğretmen (Teacher)",
    email: "ogretmen.demo@odak-egitim.com",
    password: "OdakOgretmen2026!",
    note: "Onaylı, aktif öğretmen hesabıdır.",
  },
];
