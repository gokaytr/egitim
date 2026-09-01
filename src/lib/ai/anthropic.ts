import Anthropic from "@anthropic-ai/sdk";
import { DIFFICULTY_LABELS, type QuestionDifficulty } from "@/lib/questions/difficulty";

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

// Her zorluk kademesinin AI'ya ne anlama geldigini somut olarak anlatan
// tarif - sadece "zor" kelimesini kullanmak modelin ne kadar zor uretecegini
// belirsiz birakiyordu, bu yuzden her kademe icin bilissel/yapisal bir tarif
// veriyoruz (ÖSYM'nin sinav teknikleri kitapciklarindaki mantiga yakin).
const DIFFICULTY_PROMPT_HINTS: Record<QuestionDifficulty, string> = {
  kolay:
    "doğrudan bir bilgiyi/tanımı hatırlama ya da tek adımlı, açık bir uygulama gerektirir - öğrenci soruyu okur okumaz çözüm yolunu görebilmeli",
  orta:
    "iki-üç adımlı bir uygulama ya da bir kuralı yeni bir örneğe uyarlama gerektirir - ilk bakışta çözüm yolu net değildir, biraz düşünmek gerekir",
  zor:
    "çok adımlı akıl yürütme, birden fazla kazanımı aynı anda kullanma ya da bilgiyi alışılmadık bir bağlamda/bir senaryo içinde uygulama gerektirir",
  cok_zor:
    "ÖSYM tarzı: uzun ve bağlamsal bir kök (gerekirse kısa bir senaryo/paragraf/veri seti ile başlar), birden fazla kazanımın sentezini ve dikkatli, çok adımlı bir çözümü gerektirir - deneyimli bir öğrenci bile en az bir kez kontrol etmeden emin olamaz",
};

/**
 * Öğretmenin isteği üzerine bir konuya, belirtilen zorluk kademesinde
 * yayınevi/ÖSYM kalitesinde taslak sorular üretir. Üretilen sorular
 * is_approved=false olarak kaydedilir (öğrenciye hemen gösterilir, ama
 * öğretmen/admin ayrıca "Soru Onayı" ekranından inceleyip onaylayana kadar
 * "onaylı" rozetini almaz - bkz. api/ai/generate-questions/route.ts).
 */
export async function generateQuestions(params: {
  topicName: string;
  gradeLevel: number | null;
  difficulty: QuestionDifficulty;
  count: number;
  examTypes: string[];
}) {
  const { topicName, gradeLevel, difficulty, count, examTypes } = params;

  let message;
  try {
    message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 8192,
      system:
        "Sen Türkiye'de ÖSYM sınavları (LGS, TYT, AYT, YKS) ve saygın yayınevleri için soru yazan, o işi çok iyi bilen kıdemli bir soru yazarı/editörsün. " +
        "Amacın 'ders kitabı basitliğinde' sorular değil, gerçek bir sınavda karşılaşılabilecek, özenle kurgulanmış özgün sorular üretmek. Kurallar:\n" +
        "1) Soru kökü tek cümlelik ezber sorusu olmamalı; zorluk kademesi 'orta' ve üzerindeyse bağlamlı bir cümle/kısa senaryo/veri ile kurulmalı.\n" +
        "2) Her yanlış şık RASTGELE olmamalı; her biri öğrencinin yapabileceği GERÇEKÇİ ve SPESİFİK bir hatayı (işlem hatası, kavram yanılgısı, eksik okuma, yanlış formül vb.) yansıtmalı - option_error_tags alanında bu hatayı adlandır.\n" +
        "3) Sayısal/işlem içeren bir soru yazıyorsan çözümü kafanda iki kez kontrol et, doğru cevabın gerçekten doğru olduğundan ve diğer 3 şıkkın kesinlikle yanlış olduğundan emin ol - bir soruda asla birden fazla doğru şık olamaz.\n" +
        "4) Aynı kalıbı/şablonu art arda tekrar etme; sayıları, bağlamları ve cümle yapılarını her soruda çeşitlendir.\n" +
        "5) Türkçe dil bilgisi ve yazım kurallarına tam uy.\n" +
        "6) Şekil/grafik gerektiren soru ÜRETME - sadece metinle (gerekiyorsa sayısal veri/tablo metin içinde verilerek) çözülebilecek sorular yaz. Her soru için 4 şık (A-D) ve tek doğru cevap olmalı.",
      messages: [
        {
          role: "user",
          content: `Konu: ${topicName} (${gradeLevel ? gradeLevel + ". sınıf" : "genel"})
Sınav türü: ${examTypes.join(", ") || "genel"}
Zorluk kademesi: ${DIFFICULTY_LABELS[difficulty]} — ${DIFFICULTY_PROMPT_HINTS[difficulty]}
Üretilecek soru sayısı: ${count}

Aşağıdaki JSON formatında ve SADECE JSON dizisi döndür:
[
  {
    "body": "soru metni",
    "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
    "correct_option": "A",
    "explanation": "doğru cevabın neden doğru olduğunu adım adım açıklayan çözüm - öğrenci bunu okuyunca mantığı tam anlamalı",
    "option_error_tags": {"B": "hangi somut hatayı yaptığı için bu şıkkı işaretler", "C": "...", "D": "..."}
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


const FALLBACK_QUALITY_CHECK = {
  verdict: "bilinmiyor" as const,
  summary: "Yapay zeka kontrolü şu anda yapılamadı (bağlantı sorunu ya da beklenmeyen bir hata). Soruyu elle incelemeye devam edebilirsin.",
  issues: [] as string[],
};

/**
 * Onay bekleyen bir soruyu yapay zekaya gönderip ikinci bir goz olarak
 * kontrol ettirir: dogru cevabin gercekten dogru olup olmadigi, siklarda
 * hata olup olmadigi, birden fazla dogru cevap olasiligi ve sorunun
 * anlasilirligi. Bu sadece bir ÖNERİDİR - onay/red karari yine admin ya da
 * ogretmene ait, sonuc otomatik olarak hicbir seyi degistirmez.
 */
export async function checkQuestionQuality(params: {
  body: string;
  options: Record<string, string>;
  correctOption: string;
  topicName: string | null;
  gradeLevel: number | null;
  difficulty: QuestionDifficulty | null;
}) {
  const { body, options, correctOption, topicName, gradeLevel, difficulty } = params;

  let message;
  try {
    message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system:
        "Sen Türkiye müfredatına (MEB) hakim, çoktan seçmeli sınav sorularını denetleyen titiz bir editörsün. " +
        "Sana verilen soruyu SADECE dogruluk ve kalite acisindan denetleyeceksin, yeniden yazmayacaksın. " +
        "Kısa, somut ve SADECE JSON döndüreceksin.",
      messages: [
        {
          role: "user",
          content: `Aşağıdaki soruyu kontrol et:

Konu: ${topicName ?? "belirtilmemiş"} (${gradeLevel ? gradeLevel + ". sınıf" : "genel"}), Zorluk kademesi: ${difficulty ? DIFFICULTY_LABELS[difficulty] : "belirtilmemiş"}

Soru: ${body}
${Object.entries(options)
  .map(([key, val]) => `${key}) ${val}`)
  .join("\n")}
Belirtilen doğru cevap: ${correctOption}

Şunları kontrol et:
1. Belirtilen doğru cevap gerçekten doğru mu?
2. Şıklarda yazım/mantık hatası var mı?
3. Birden fazla şık doğru kabul edilebilir mi (belirsizlik)?
4. Soru metni açık ve anlaşılır mı?
5. Konu ve sınıf seviyesine uygun mu?

Aşağıdaki JSON formatında ve SADECE JSON döndür:
{
  "verdict": "sorun_yok" | "sorunlu",
  "summary": "1-2 cümlelik genel değerlendirme",
  "issues": ["varsa somut sorunlar, madde madde - yoksa boş dizi"]
}`,
        },
      ],
    });
  } catch (err) {
    console.error("checkQuestionQuality: anthropic isteği başarısız", err);
    return FALLBACK_QUALITY_CHECK;
  }

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    return FALLBACK_QUALITY_CHECK;
  }
}
