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
}): {
  weakness_level: WeaknessLevel;
  ai_summary: string;
  common_error_pattern: string | null;
  recommended_action: RecommendedAction;
} {
  const { topicName, correctCount, wrongCount, emptyCount, wrongAnswers } = params;
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
  let recommended_action: RecommendedAction;
  if (weakness_level === "none") {
    recommended_action = "none";
  } else if (accuracy < 0.35 || (weakness_level === "major" && wrongCount >= 5)) {
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

  // --- Özet metin -----------------------------------------------------
  const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const lines: string[] = [];

  if (weakness_level === "none") {
    lines.push(`Harika gidiyorsun! "${topicName}" konusunda ${total} sorudan ${correctCount} tanesini doğru yaptın (%${percent}). Bu konuda eksiğin görünmüyor.`);
  } else if (weakness_level === "minor") {
    lines.push(`"${topicName}" konusunda ${total} sorudan ${correctCount} doğru, ${wrongCount} yanlış yaptın (%${percent} başarı). Konuyu genel olarak biliyorsun ama küçük eksiklerin var.`);
  } else {
    lines.push(`"${topicName}" konusunda ${total} sorudan sadece ${correctCount} tanesini doğru yaptın (%${percent} başarı). Bu konuda ciddi bir eksik görünüyor, temelden tekrar etmen gerekiyor.`);
  }

  if (emptyRatio >= 0.2) {
    lines.push(`Sorularin %${Math.round(emptyRatio * 100)}'ini boş bıraktın — zaman yönetimine ya da soruyu atlamak yerine tahmin/analiz yapmaya dikkat et.`);
  }

  if (common_error_pattern) {
    lines.push(`Genel hata örüntün: ${common_error_pattern}.`);
  }

  if (concepts.length > 0 && weakness_level !== "none") {
    lines.push(`Şunlara çalışmalısın:\n${concepts.map((c) => `• ${c}`).join("\n")}`);
  }

  if (recommended_action === "tutor_referral") {
    lines.push("Bu konuda tek başına ilerlemek zor görünüyor, bir öğretmenle özel ders yapmanı öneririz — talebin oluşturuldu.");
  } else if (recommended_action === "watch_video") {
    lines.push("Devam etmeden önce bu konunun anlatım videosunu izlemeni öneririz.");
  } else if (recommended_action === "practice_more") {
    lines.push("Bu konudan birkaç test daha çözerek pekiştirmeni öneririz.");
  }

  return {
    weakness_level,
    ai_summary: lines.join("\n\n"),
    common_error_pattern,
    recommended_action,
  };
}
