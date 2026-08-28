// Veli raporlama ekraninin ilk acilis sekmesinde gosterilen, ogrencinin genel
// durumunu ayrintili anlatan cok paragrafli ozet metni. rule-based.ts'deki
// (tek quiz sonrasi degerlendirme) mantigin ayni ruhtaki, ama tum gecmisi
// kapsayan genel-durum versiyonu.

export function buildOverviewSummary(params: {
  studentFirstName: string;
  totalSolved: number;
  totalCorrect: number;
  totalWrong: number;
  totalEmpty: number;
  accuracy: number | null;
  distinctContentViewed: number;
  weakTopicNames: string[];
  latestCommonErrorPattern?: string | null;
  pendingReferralTopics: string[];
}): string[] {
  const {
    studentFirstName,
    totalSolved,
    totalCorrect,
    totalWrong,
    accuracy,
    distinctContentViewed,
    weakTopicNames,
    latestCommonErrorPattern,
    pendingReferralTopics,
  } = params;

  const paragraphs: string[] = [];

  if (totalSolved === 0) {
    paragraphs.push(
      `${studentFirstName} henüz hiç soru çözmemiş. Genel durumu görebilmek için önce bir konu seçip test çözmesi gerekiyor.`
    );
  } else if (accuracy !== null && accuracy >= 75) {
    paragraphs.push(
      `${studentFirstName} şu ana kadar toplam ${totalSolved} soru çözdü ve %${accuracy} başarı oranıyla genel olarak iyi gidiyor. ${totalCorrect} doğru, ${totalWrong} yanlış cevap verdi.`
    );
  } else if (accuracy !== null && accuracy >= 50) {
    paragraphs.push(
      `${studentFirstName} şu ana kadar toplam ${totalSolved} soru çözdü, başarı oranı %${accuracy}. Orta seviyede gidiyor ama düzenli takip ve tekrar gerekiyor. ${totalCorrect} doğru, ${totalWrong} yanlış cevap verdi.`
    );
  } else if (accuracy !== null) {
    paragraphs.push(
      `${studentFirstName} şu ana kadar toplam ${totalSolved} soru çözdü, ancak başarı oranı %${accuracy} ile düşük. Bu konularda ek destek ve daha sık tekrar gerekiyor. ${totalCorrect} doğru, ${totalWrong} yanlış cevap verdi.`
    );
  }

  if (distinctContentViewed === 0) {
    paragraphs.push(
      "Henüz hiç konu anlatımı izlememiş. Soru çözmeden önce ilgili konu anlatımını izlemesi kalıcı öğrenme açısından faydalı olur."
    );
  } else {
    paragraphs.push(`Şimdiye kadar ${distinctContentViewed} farklı konu anlatımını izledi.`);
  }

  if (weakTopicNames.length > 0) {
    paragraphs.push(
      `En çok zorlandığı konular: ${weakTopicNames.join(", ")}. ${
        latestCommonErrorPattern ? latestCommonErrorPattern : "Bu konularda tekrar yapması öneriliyor."
      }`
    );
  }

  if (pendingReferralTopics.length > 0) {
    paragraphs.push(
      `Şu anda ${pendingReferralTopics.join(", ")} konusunda özel ders desteği bekleniyor. Bir öğretmen talebi üstlendiğinde burada ders saati göreceksin.`
    );
  } else if (totalSolved > 0) {
    paragraphs.push("Şu an için özel ders ihtiyacı görünmüyor.");
  }

  return paragraphs;
}
