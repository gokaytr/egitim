// Kural tabanlı (AI API'si kullanmayan, ücretsiz) değerlendirme motoru.
// Öğrencinin doğru/yanlış/boş sayısına, yanlış yaptığı soruların hata
// etiketlerine ve soru metinlerinden çıkarılan alt-konu ipuçlarına bakarak
// detaylı bir değerlendirme, hata örüntüsü ve "şunlara çalışmalısın" tarzı
// somut yönlendirme üretir. Anthropic/AI kullanmadığı için maliyetsizdir.

type WrongAnswer = {
  questionBody: string;
  selectedOption: string | null;
  correctOption: string;
  errorTag?: string | null;
};

type WeaknessLevel = "none" | "minor" | "major";
type RecommendedAction = "practice_more" | "watch_video" | "tutor_referral" | "none";

// Soru metnindeki anahtar kelimelere göre alt-konu tahmini. Yeni konular
// eklendikçe bu liste büyütülebilir; eşleşme yoksa genel konu adı kullanılır.
const CONCEPT_KEYWORDS: { pattern: RegExp; concept: string }[] = [
  { pattern: /dış açı/i, concept: "Dış açı teoremi" },
  { pattern: /ikizkenar/i, concept: "İkizkenar üçgende taban açıları" },
  { pattern: /eşkenar/i, concept: "Eşkenar üçgende açı hesabı" },
  { pattern: /dik üçgen|dik açı/i, concept: "Dik üçgende açı ilişkileri" },
  { pattern: /oranlı|x,\s*2x|orant/i, concept: "Oranlı açı problemleri" },
  { pattern: /iç açı.*toplam|toplamı kaç derece/i, concept: "Üçgende iç açılar toplamı (180°)" },
];

function guessConcept(questionBody: string, fallback: string): string {
  const match = CONCEPT_KEYWORDS.find((c) => c.pattern.test(questionBody));
  return match ? match.concept : fallback;
}

const ERROR_TAG_LABELS: Record<string, string> = {
  işlem_hatası: "işlem hatası (hesaplama sırasında hata)",
  islem_hatasi: "işlem hatası (hesaplama sırasında hata)",
  kavram_yanilgisi: "kavram yanılgısı (konu tam oturmamış)",
  kavram_yanılgısı: "kavram yanılgısı (konu tam oturmamış)",
  dikkatsizlik: "dikkatsizlik (soruyu doğru anlayıp yanlış işaretleme)",
  zaman_yetersizliği: "zaman yetersizliği",
  zaman_yetersizligi: "zaman yetersizliği",
};

export function ruleBasedDiagnosis(params: {
  topicName: string;
  gradeLevel: number | null;
  correctCount: number;
  wrongCount: number;
  emptyCount: number;
  wrongAnswers: WrongAnswer[];
  // Bu ogrencinin bu konuda DAHA ONCE "major" (ciddi eksik) cikan analiz
  // sayisi (bu deneme haric). Tek bir kotu denemede hemen ozel derse
  // yonlendirmek yerine, once konuyu tekrar etmesi istenir; ozel ders ancak
  // ayni konuda tekrar tekrar basarisiz olunca (bu sayi >= 1 iken) onerilir -
  // ve o zaman bile otomatik talep olusturulmaz, sadece veliye bu secenek
  // sunulur (veli isterse "Özel Ders Talebi" sayfasindan kendisi talep eder).
  priorMajorCount?: number;
}): {
  weakness_level: WeaknessLevel;
  ai_summary: string;
  // Ogrenciye test bittiginde ekranda gosterilen KISA versiyon - detayli
  // (cok paragrafli) ai_summary sadece veliye ve gecmis analiz listesine
  // gosterilir, ogrencinin sonuc ekraninda karsisina bu kisa cumle cikar.
  student_summary: string;
  common_error_pattern: string | null;
  recommended_action: RecommendedAction;
} {
  const { topicName, correctCount, wrongCount, emptyCount, wrongAnswers, priorMajorCount = 0 } = params;
  const attempted = correctCount + wrongCount;
  const total = attempted + emptyCount;
  const accuracy = attempted > 0 ? correctCount / attempted : 0;
  const emptyRatio = total > 0 ? emptyCount / total : 0;

  // --- Seviye belirleme -----------------------------------------------
  let weakness_level: WeaknessLevel;
  if (total === 0) {
    weakness_level = "minor";
  } else if (accuracy >= 0.8 && emptyRatio < 0.2) {
    weakness_level = "none";
  } else if (accuracy >= 0.5) {
    weakness_level = "minor";
  } else {
    weakness_level = "major";
  }

  // --- Önerilen aksiyon --------------------------------------------------
  // Öğrenci tek bir denemede kötü sonuç aldı diye hemen özel derse
  // yönlendirilmez - önce konuyu tekrar etmesi (video + yeni sorular)
  // istenir. Aynı konuda daha önce de "major" (ciddi eksik) çıkmışsa, yani
  // eksik tekrar tekrar sürüyorsa, ancak o zaman özel ders bir seçenek
  // olarak öne çıkarılır (veliye - otomatik talep oluşturulmadan).
  let recommended_action: RecommendedAction;
  if (weakness_level === "none") {
    recommended_action = "none";
  } else if (weakness_level === "major" && priorMajorCount >= 1) {
    recommended_action = "tutor_referral";
  } else if (weakness_level === "major") {
    recommended_action = "watch_video";
  } else {
    recommended_action = "practice_more";
  }

  // --- Hata örüntüsü: etiketlenmiş hatalardan en sık geçeni bul ----------
  const tagCounts = new Map<string, number>();
  for (const w of wrongAnswers) {
    if (w.errorTag) tagCounts.set(w.errorTag, (tagCounts.get(w.errorTag) ?? 0) + 1);
  }
  let common_error_pattern: string | null = null;
  if (tagCounts.size > 0) {
    const [topTag] = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    common_error_pattern = ERROR_TAG_LABELS[topTag] ?? topTag;
  } else if (wrongCount >= 3) {
    common_error_pattern = "Yanlışların hata türü etiketlenmemiş, ancak birden fazla soruda hata var — muhtemelen konu tam oturmamış.";
  }

  // --- Çalışılması gereken alt-konular ------------------------------------
  const concepts = [...new Set(wrongAnswers.map((w) => guessConcept(w.questionBody, topicName)))].slice(0, 4);

  // --- Özet metin: bilinçli olarak birden fazla cümleye yayılmış, öğretmen
  // geri bildirimi gibi okunan uzun bir metin (common_error_pattern ayrıca
  // ayrı bir rozet olarak gösterildiği için burada tekrar edilmiyor). -----
  const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const paragraphs: string[] = [];

  // 1) Giriş + genel performans değerlendirmesi (birkaç cümle)
  if (weakness_level === "none") {
    paragraphs.push(
      `Harika gidiyorsun! "${topicName}" konusunda çözdüğün ${total} sorunun ${correctCount} tanesini doğru yaptın, bu da %${percent} başarı demek. ` +
      `Bu sonuç, konunun temel mantığını ve işlem adımlarını iyi kavradığını gösteriyor. ` +
      `Bu seviyeyi korumak için ara sıra tekrar sorusu çözmen yeterli olur, şu an için ekstra bir çalışmaya ihtiyacın yok.`
    );
  } else if (weakness_level === "minor") {
    paragraphs.push(
      `"${topicName}" konusunda ${total} sorudan ${correctCount} tanesini doğru, ${wrongCount} tanesini yanlış yaptın; bu da %${percent} başarı oranına karşılık geliyor. ` +
      `Bu sonuç, konunun ana fikrini kavradığını ama bazı noktalarda hâlâ tam oturmamış detaylar olduğunu gösteriyor. ` +
      `Doğru cevaplarının çoğunlukta olması cesaret verici; birkaç eksiği kapatırsan bu konuyu tamamen kendine mal edebilirsin.`
    );
  } else {
    paragraphs.push(
      `"${topicName}" konusunda ${total} sorudan sadece ${correctCount} tanesini doğru yapabildin, bu da %${percent} gibi düşük bir başarı oranı anlamına geliyor. ` +
      `Bu durum, konunun temel kurallarında ciddi bir boşluk olduğuna işaret ediyor; yani hatalar tek tük küçük yanlışlardan değil, konunun kendisinin tam öğrenilmemiş olmasından kaynaklanıyor. ` +
      `Üzülmene gerek yok, her eksik konu doğru bir tekrar planıyla kapatılabilir — önemli olan şimdi nereden başlayacağını bilmen.`
    );
  }

  // 2) Boş bırakma / zaman yönetimi yorumu (varsa)
  if (emptyRatio >= 0.2) {
    paragraphs.push(
      `Ayrıca soruların %${Math.round(emptyRatio * 100)}'ini boş bıraktığını fark ettik. ` +
      `Bu, ya süre yetiştirememe ya da emin olmadığın sorularda tahmin etmek yerine pas geçme alışkanlığından kaynaklanıyor olabilir. ` +
      `Sınavda boş bırakmak yerine, bildiğin kadarıyla mantık yürütüp bir seçenek işaretlemeyi dene; bu küçük alışkanlık bile net sayını artırabilir.`
    );
  }

  // 3) Hata örüntüsü yorumu (varsa) - ayrı rozette de gösterildiği için
  // burada tekrar etmek yerine ne anlama geldiğini açıklıyoruz.
  if (common_error_pattern) {
    paragraphs.push(
      `Yanlışlarını incelediğimizde ortaya çıkan en belirgin eğilim şu: ${common_error_pattern}. ` +
      `Bunu bilmek önemli, çünkü doğru çözüm yolunu bilip bilmediğinden çok, hatanın nerede oluştuğunu bilmek çalışma şeklini değiştirmeni sağlar.`
    );
  }

  // 4) Çalışılması gereken alt konular - madde madde ama önce açıklayıcı bir cümleyle
  if (concepts.length > 0 && weakness_level !== "none") {
    paragraphs.push(
      `Yanlış yaptığın soruları tek tek incelediğimizde, özellikle şu alt konularda tekrar yapman gerektiğini görüyoruz. ` +
      `Bu başlıkları sırayla çalışırsan, bir sonraki testte belirgin bir fark göreceksin:\n` +
      concepts.map((c) => `• ${c}`).join("\n")
    );
  }

  // 5) Somut yönlendirme + kapanış motivasyon cümlesi
  if (recommended_action === "tutor_referral") {
    paragraphs.push(
      `Bu konuda daha önce de zorlandığını gördük - yani eksik tek seferlik değil, tekrar tekrar karşımıza çıkıyor. ` +
      `Bu durumu ailenle paylaştık; ailen isterse "Özel Ders Talebi" sayfasından senin için bir öğretmenle birebir ders talep edebilir. ` +
      `Bu arada konuyu tamamen bırakma, aşağıdaki alt başlıkları tekrar tekrar gözden geçirmeye devam et.`
    );
  } else if (recommended_action === "watch_video") {
    paragraphs.push(
      `Şu an yapman gereken en önemli şey bu konuyu tekrar etmek: önce anlatım videosunu baştan izle, sonra aynı konudan birkaç soru daha çöz. ` +
      `Hemen özel ders gerekmiyor - çoğu zaman bir tekrar bu tür eksikleri kapatmaya yeter, bir sonraki denemende ne kadar geliştiğini göreceksin.`
    );
  } else if (recommended_action === "practice_more") {
    paragraphs.push(
      `Konunun mantığını büyük ölçüde biliyorsun, bu yüzden yeni bir anlatıma gerek yok — birkaç test daha çözerek küçük eksiklerini kapatman yeterli olacaktır. ` +
      `Yanlış yaptığın soru tiplerine benzer sorulardan seçerek çalışırsan daha hızlı ilerlersin.`
    );
  }

  // --- Öğrenciye gösterilecek kısa özet -----------------------------------
  let student_summary: string;
  if (weakness_level === "none") {
    student_summary = `Harika! "${topicName}" konusunda %${percent} başarı gösterdin, bu seviyeni korumaya devam et.`;
  } else if (recommended_action === "tutor_referral") {
    student_summary = `"${topicName}" konusunda tekrar zorlandın (%${percent}). Bu durumu ailenle paylaştık; ailen isterse senin için özel ders talep edebilir.`;
  } else if (recommended_action === "watch_video") {
    student_summary = `"${topicName}" konusunda bu sefer zorlandın (%${percent}). Anlatım videosunu tekrar izleyip aynı konudan birkaç soru daha çöz.`;
  } else {
    student_summary = `"${topicName}" konusunda %${percent} başarı gösterdin, birkaç eksiğini kapatırsan konuyu tamamen kendine mal edebilirsin.`;
  }

  return {
    weakness_level,
    ai_summary: paragraphs.join("\n\n"),
    student_summary,
    common_error_pattern,
    recommended_action,
  };
}
