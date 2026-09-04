// Anasayfadaki "Odak ile neler değişir?" bölümündeki 6 kutunun sabit
// başlık/açıklama metinleri ve varsayılan (admin hiçbir şey seçmediyse
// kullanılan) görselleri. Hem anasayfa (src/app/page.tsx) hem de admin
// panelindeki "Anasayfa Ayarları" formu aynı listeyi kullanır, böylece
// ikisi arasında sıra/metin farkı oluşmaz.
export const FEATURE_TILES = [
  {
    title: "1-2 Soruyla Eksik Tespiti",
    desc: "Birkaç soruyla tam olarak nerede takıldığını bulur",
    defaultImage: "/grade-bg/ilkokul-1.jpg",
  },
  {
    title: "Kişisel Yıllık Program",
    desc: "Hedefe göre otomatik çalışma takvimi ve haftalık hedefler",
    defaultImage: "/grade-bg/ortaokul-1.jpg",
  },
  {
    title: "Yapay Zekâ Destekli Analiz",
    desc: "Yanlışlardaki ortak hata örüntüsünü tespit eder",
    defaultImage: "/grade-bg/lise-1.jpg",
  },
  {
    title: "Gerektiğinde Özel Ders",
    desc: "Uzman bir öğretmenle eşleştirilir, online ders randevusu alınır",
    defaultImage: "/grade-bg/ortaokul-2.jpg",
  },
  {
    title: "Anlık Veli Bilgilendirmesi",
    desc: "İlerleme raporları ve sınav sonuçları veliye anlık yansır",
    defaultImage: "/grade-bg/ilkokul-2.jpg",
  },
  {
    title: "1. Sınıftan 12. Sınıfa Tüm Dersler",
    desc: "Müfredata birebir uygun konu ağacıyla tüm dersler",
    defaultImage: "/grade-bg/ilkokul-3.jpg",
  },
] as const;

export const HERO_DEFAULT_IMAGE = "/grade-bg/varsayilan.jpg";

// question-topic-panel.tsx'teki EXAM_ROW_ORDER ile ayni sinav kumesi -
// kullanicinin "sisteme DGS/YDS/YOKDIL de eklendi, anasayfada da gorunsun"
// talebiyle guncellendi, artik platformdaki TUM sinav turlerini kapsiyor.
export const EXAM_COURSES = ["BILSEM", "LGS", "TYT", "AYT", "YDT", "YKS", "DGS", "KPSS", "ALES", "YDS", "YOKDIL"];
