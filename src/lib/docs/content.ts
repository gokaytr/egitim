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
        body: "Kullanıcılar sekmesinden tüm hesapları görebilir, rollerini değiştirebilirsin. Öğretmen başvuruları ayrı bir sekmede onay bekler; onaylanan hesap otomatik olarak 'teacher' rolüne geçer.",
      },
      {
        title: "Müfredat ve konu yönetimi",
        body: "Müfredat sekmesinden ders (Türkçe, Matematik, Fen Bilimleri, Sosyal Bilgiler, İngilizce vb.) ve konu ekleyip düzenleyebilirsin. Öğrenciler derslerini kartlar halinde, konularını da o dersin altında görür.",
      },
      {
        title: "Soru ekleme",
        body: "Soru Ekle sekmesinden bir konu seçip elle soru ekleyebilir, yapay zekaya (ücretsiz kural tabanlı değil, Anthropic API ile) taslak sorular ürettirebilir veya kopyala-yapıştır ile ya da PDF/Word dosyası yükleyerek toplu soru içe aktarabilirsin. AI ile üretilen sorular önce Soru Onayı sekmesinden onaylanmalı.",
      },
      {
        title: "Soru onayı",
        body: "Soru Onayı sekmesi, yapay zekanın ürettiği ve henüz onaylanmamış soruları listeler. Onaylamadan öğrenciye gösterilmezler.",
      },
      {
        title: "Veli bağlantıları",
        body: "Veli Bağlantıları sekmesinden hangi velinin hangi öğrenciyle ilişkilendirildiğini görebilir, yeni bağlantı ekleyip silebilirsin. Veliler ayrıca kendi ekranlarından öğrencinin e-postasıyla kendi kendilerine çocuk ekleyebilir.",
      },
      {
        title: "Önizleme ekranları",
        body: "Admin panelinden Üye Ekranı, Öğretmen Ekranı ve Veli Görünümü'nü doğrudan önizleyebilirsin - ayrı bir hesapla giriş yapmana gerek yok.",
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
        title: "Soru ekleme yöntemleri",
        body: "Soru Ekle sayfasında üç yöntem var: (1) Elle soru ekleme - soru metni, 4 şık, doğru cevap ve opsiyonel görsel/açıklama gir. (2) Yapay zeka ile üretim - zorluk ve adet belirle, üretilen sorular admin onayına düşer. (3) Toplu içe aktarma - belirli bir formatta metni yapıştır ya da PDF/Word dosyası yükle (dosyadan metin otomatik çıkarılır), sistem soruları ayrıştırıp önizleme gösterir, onayladığın soruları tek seferde ekler. Not: JPEG/taranmış görsellerden otomatik soru okuma şimdilik desteklenmiyor; sadece gerçek metin içeren dosyalar (PDF/Word/TXT) veya yapıştırılan metin kullanılabilir.",
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
        body: "Değerlendirme sonucu 'özel ders öner' çıkan öğrenciler için bir talep oluşur ve Özel Ders sayfasında listelenir. Bekleyen bir talebi 'Üstlen' diyerek üzerine alabilir, ardından tarih/saat ve süre belirleyip dersi planlayabilirsin. Ders gerçekleştikten sonra 'Tamamlandı' olarak işaretlenir.",
      },
      {
        title: "Öğrenci görünürlüğü",
        body: "Öğretmen olarak öğrencilerin ders bazlı ilerlemesini, çözdükleri soru sayısını ve genel durumlarını veli raporlama ekranına benzer şekilde admin panelindeki önizlemelerden takip edebilirsin.",
      },
    ],
  },
  {
    role: "parent",
    heading: "Veli",
    items: [
      {
        title: "Raporlama ekranı",
        body: "Veli girişinde; öğrencinin kaç soru çözdüğü, doğru/yanlış/boş dağılımı, kaç konu anlatımı izlediği, özel ders ihtiyacı olup olmadığı ve genel durumu (zayıf/orta/iyi) tek ekranda özetlenir.",
      },
      {
        title: "Birden fazla öğrenci",
        body: "Bir veli hesabına birden fazla öğrenci bağlanabilir; ekranın üstündeki öğrenci seçiciden aralarında geçiş yapılabilir. Yeni bir çocuk eklemek için öğrencinin platformdaki e-posta adresini girmek yeterli.",
      },
    ],
  },
  {
    role: "student",
    heading: "Öğrenci",
    items: [
      {
        title: "Ders ve konu seçimi",
        body: "Öğrenci girişinde önce ders kartları (Türkçe, Matematik, Fen Bilimleri vb.), sonra o dersin konuları listelenir. Bir konuya girince varsa konu anlatımı, ardından o konunun soruları gösterilir.",
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
