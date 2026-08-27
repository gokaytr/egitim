import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const AI_MODEL = "claude-sonnet-4-5";

type WrongAnswer = {
  questionBody: string;
  selectedOption: string | null;
  correctOption: string;
  errorTag?: string | null;
};

const FALLBACK_DIAGNOSIS = {
  weakness_level: "minor" as const,
  ai_summary: "Otomatik analiz şu anda üretilemedi, sonuçların yine de kaydedildi. Lütfen daha sonra tekrar dene.",
  common_error_pattern: null,
  recommended_action: "practice_more" as const,
};

/**
 * Öğrencinin bir konudaki yanlışlarından eksik tespiti + genel hata örüntüsü çıkarır.
 * Anthropic isteği herhangi bir sebeple (geçersiz anahtar, ağ hatası, oran sınırı vb.)
 * başarısız olursa öğrenci ekranda sonsuza kadar beklemesin diye güvenli bir
 * yedek (fallback) sonuç döner - hata yukarı fırlatılmaz.
 */
export async function diagnoseWeakness(params: {
  topicName: string;
  gradeLevel: number | null;
  correctCount: number;
  wrongCount: number;
  emptyCount: number;
  wrongAnswers: WrongAnswer[];
}) {
  const { topicName, gradeLevel, correctCount, wrongCount, emptyCount, wrongAnswers } = params;

  let message;
  try {
    message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system:
        "Sen Türkiye müfredatına (MEB) hakim, lise ve üniversiteye hazırlık sınavları (LGS, TYT, AYT, YKS, KPSS, ALES) konusunda uzman bir eğitim koçusun. " +
        "Öğrencinin bir konudaki test sonucunu analiz edip JSON formatında çıktı vereceksin. Kısa, somut ve öğrenciye doğrudan hitap eden bir dille yaz.",
      messages: [
        {
          role: "user",
          content: `Konu: ${topicName} (${gradeLevel ? gradeLevel + ". sınıf" : "genel"})
Doğru: ${correctCount}, Yanlış: ${wrongCount}, Boş: ${emptyCount}

Yanlış yapılan sorular:
${wrongAnswers
  .map(
    (w, i) =>
      `${i + 1}. Soru: ${w.questionBody}\n   Öğrencinin cevabı: ${w.selectedOption ?? "boş"} | Doğru cevap: ${w.correctOption} | Hata etiketi: ${w.errorTag ?? "belirtilmemiş"}`
  )
  .join("\n")}

Aşağıdaki JSON formatında ve SADECE JSON döndür:
{
  "weakness_level": "none" | "minor" | "major",
  "ai_summary": "öğrenciye 2-3 cümlelik kişisel geri bildirim",
  "common_error_pattern": "yanlışlardaki ortak hata eğilimi (ör. işlem hatası, kavram yanılgısı, dikkatsizlik, zaman yetersizliği) - tek cümle",
  "recommended_action": "practice_more" | "watch_video" | "tutor_referral" | "none"
}`,
        },
      ],
    });
  } catch (err) {
    console.error("diagnoseWeakness: anthropic isteği başarısız", err);
    return FALLBACK_DIAGNOSIS;
  }

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return FALLBACK_DIAGNOSIS;
  }
}

/**
 * Öğretmenin isteği üzerine bir konuya, belirtilen zorluk seviyesinde
 * taslak sorular üretir. Üretilen sorular is_approved=false olarak kaydedilmelidir.
 */
export async function generateQuestions(params: {
  topicName: string;
  gradeLevel: number | null;
  difficulty: number;
  count: number;
  examTypes: string[];
}) {
  const { topicName, gradeLevel, difficulty, count, examTypes } = params;

  let message;
  try {
    message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      system:
        "Sen Türkiye müfredatına uygun, çıkmış sınav sorularının tarzına yakın çoktan seçmeli soru hazırlayan bir eğitim içerik uzmanısın. " +
        "Şekil/grafik gerektiren soru ÜRETME - sadece metinle çözülebilecek sorular yaz. Her soru için 4 şık (A-D) ve tek doğru cevap olmalı.",
      messages: [
        {
          role: "user",
          content: `Konu: ${topicName} (${gradeLevel ? gradeLevel + ". sınıf" : "genel"})
Sınav türü: ${examTypes.join(", ") || "genel"}
Zorluk seviyesi (1-5): ${difficulty}
Üretilecek soru sayısı: ${count}

Aşağıdaki JSON formatında ve SADECE JSON dizisi döndür:
[
  {
    "body": "soru metni",
    "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
    "correct_option": "A",
    "explanation": "çözüm açıklaması",
    "option_error_tags": {"B": "işlem_hatası", "C": "kavram_yanilgisi", "D": "dikkatsizlik"}
  }
]`,
        },
      ],
    });
  } catch (err) {
    console.error("generateQuestions: anthropic isteği başarısız", err);
    return [];
  }

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "[]";

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return [];
  }
}
