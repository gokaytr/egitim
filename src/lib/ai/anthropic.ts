import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { DIFFICULTY_LABELS, type QuestionDifficulty } from "@/lib/questions/difficulty";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const AI_MODEL = "claude-sonnet-4-5";

// Repo kokundeki question-generation.md (pedagojik/teknik uretim algoritmasi)
// ve question-quality.md (100 puanlik otomatik kalite rubrigi, 80 puan kabul
// esigi) dosyalarini okuyup soru uretim/ayristirma sistem prompt'larina
// ekliyoruz - bkz. CLAUDE.md "Soru üretimi/kalitesi kuralı". Bu dosyalar
// sadece insan icin okunan dokumantasyon degil, fiilen uygulanan bir
// sozlesme; bir kere okuyup process boyunca onbellekliyoruz (her istekte
// diskten okumaya gerek yok, icerik dagitim sirasinda degismiyor).
let cachedPolicyDocs: string | null = null;
function loadQuestionPolicyDocs(): string {
  if (cachedPolicyDocs !== null) return cachedPolicyDocs;
  try {
    const generation = fs.readFileSync(path.join(process.cwd(), "question-generation.md"), "utf-8");
    const quality = fs.readFileSync(path.join(process.cwd(), "question-quality.md"), "utf-8");
    cachedPolicyDocs = `${generation}\n\n${quality}`;
  } catch (err) {
    console.error("loadQuestionPolicyDocs: politika dosyaları okunamadı, varsayılan kurallarla devam ediliyor", err);
    cachedPolicyDocs = "";
  }
  return cachedPolicyDocs;
}

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
export type ReferenceExample = {
  body: string;
  options: Record<string, string>;
  correct_option: string;
};

// ÖSYM'nin sayısal derslerdeki (Matematik, Geometri, Fizik, Kimya, Fen
// Bilimleri...) sorulari neredeyse hep kisa bir "gercek hayat senaryosu/
// paragraf" ile baslar (ör. "Bir çiftçi tarlasını..."), SOYUT bir islem
// sorusu ("2x+5=17 ise x kactir?" gibi) NADIREN cikar - kullanicinin
// bildirdigi "sizin urettiginiz matematik sorulari OSYM gibi degil, cok
// kisa/soyut kaliyor" sikayetinin kok nedeni, bu bagimsal/paragraf tarzinin
// sadece EN ust zorluk kademesinde istenmesiydi. Artik sayisal derslerde bu
// tarz TUM zorluk kademelerinde (kolay dahil, orantili sekilde) varsayilan.
const NUMERIC_SUBJECTS = ["matematik", "geometri", "fizik", "kimya", "fen bilimleri", "fen bilgisi", "istatistik"];

export async function generateQuestions(params: {
  topicName: string;
  gradeLevel: number | null;
  difficulty: QuestionDifficulty;
  count: number;
  examTypes: string[];
  subjectName?: string | null;
  referenceExamples?: ReferenceExample[];
}) {
  const { topicName, gradeLevel, difficulty, count, examTypes, subjectName, referenceExamples = [] } = params;
  const isNumericSubject = !!subjectName && NUMERIC_SUBJECTS.some((s) => subjectName.toLocaleLowerCase("tr-TR").includes(s));

  // Soru Havuzu'na (is_reference_only=true, ör. ÖSYM'nin gerçek sınav
  // sorulari) eklenmis, AYNI konuya ait ornekler varsa, bunlari AI'ya
  // "tarz/uslup/zorluk referansi" olarak veriyoruz - "soru üretirken
  // buradaki bilgiyi inceleyip ona göre soru üretebilmeli" talebi. Basit ve
  // deterministik: embedding/benzerlik siralamasi yok, sadece ayni topic_id
  // ile dogrudan eslesen birkac ornek (kullanicinin sectigi "yeni API
  // anahtari istemeden basit alternatif" yaklasimiyla tutarli). AI'ya bu
  // sorulari BİREBİR KOPYALAMAMASI, sadece tarz/zorluk/format referansi
  // olarak kullanmasi acikca soyleniyor - telif nedeniyle.
  const referenceBlock = referenceExamples.length
    ? `\n\nAşağıda bu konuyla ilgili GERÇEK SINAV sorularından örnekler var (Soru Havuzu'ndan). Bunları ASLA birebir kopyalama veya küçük değişikliklerle tekrar üretme - sadece soru tarzını, dil düzeyini, zorluk seviyesini ve soru kurgusu biçimini anlamak için referans al, tamamen özgün yeni sorular yaz:\n${referenceExamples
        .map(
          (ex, i) =>
            `${i + 1}) ${ex.body}\n${Object.entries(ex.options)
              .map(([k, v]) => `${k}) ${v}`)
              .join(" ")}\nDoğru cevap: ${ex.correct_option}`
        )
        .join("\n\n")}`
    : "";

  let message;
  try {
    message = await anthropic.messages.create({
      model: AI_MODEL,
      // Soru basina eklenen yeni alanlar (quality_score, cognitive_level,
      // question_type) ve uzun bir politika dokumani sistem prompt'una
      // eklendigi icin sinir yukseltildi - buyuk bir toplu istekte (ör. 30+
      // soru) cikti kesilmesin diye (bkz. parseExamText'teki ayni gerekce).
      max_tokens: 16000,
      system:
        "Sen Türkiye'de ÖSYM sınavları (LGS, TYT, AYT, YKS) ve saygın yayınevleri için soru yazan, o işi çok iyi bilen kıdemli bir soru yazarı/editörsün. " +
        "Amacın 'ders kitabı basitliğinde' sorular değil, gerçek bir sınavda karşılaşılabilecek, özenle kurgulanmış özgün sorular üretmek. Kurallar:\n" +
        "1) Soru kökü tek cümlelik ezber sorusu olmamalı; zorluk kademesi 'orta' ve üzerindeyse bağlamlı bir cümle/kısa senaryo/veri ile kurulmalı.\n" +
        "2) Her yanlış şık RASTGELE olmamalı; her biri öğrencinin yapabileceği GERÇEKÇİ ve SPESİFİK bir hatayı (işlem hatası, kavram yanılgısı, eksik okuma, yanlış formül vb.) yansıtmalı - option_error_tags alanında bu hatayı adlandır.\n" +
        "3) Sayısal/işlem içeren bir soru yazıyorsan çözümü kafanda iki kez kontrol et, doğru cevabın gerçekten doğru olduğundan ve diğer 3 şıkkın kesinlikle yanlış olduğundan emin ol - bir soruda asla birden fazla doğru şık olamaz.\n" +
        "4) Aynı kalıbı/şablonu art arda tekrar etme; sayıları, bağlamları ve cümle yapılarını her soruda çeşitlendir.\n" +
        "5) Türkçe dil bilgisi ve yazım kurallarına tam uy.\n" +
        "6) Şekil/grafik gerektiren soru ÜRETME - sadece metinle (gerekiyorsa sayısal veri/tablo metin içinde verilerek) çözülebilecek sorular yaz. Her soru için 4 şık (A-D) ve tek doğru cevap olmalı.\n" +
        (isNumericSubject
          ? "7) Bu ders SAYISAL (Matematik/Geometri/Fizik/Kimya/Fen Bilimleri gibi) - ÖSYM'nin gerçek sınavlarındaki gibi soruyu SOYUT bir işlem/formül sorusu olarak sorma ('2x+5=17 ise x kaçtır?' gibi kuru sorulardan KAÇIN), bunun yerine kısa bir GÜNLÜK HAYAT/GERÇEK DÜNYA SENARYOSU içinde sun (bir çiftçi, fabrika, market, yolculuk, yüzde/oran, para problemi gibi somut bir bağlam kur, sonra sayısal veriyi bu bağlam içinde ver). Bu, 'kolay' zorlukta bile (tek adımlı olsa da) KISA bir bağlam cümlesiyle başlamalı; zorluk arttıkça bağlam/senaryo da uzayıp karmaşıklaşmalı - tamamen bağlamsız, sadece bir denklem/işlem yazan bir soru kökü YAZMA.\n"
          : "") +
        "8) Her soruyu döndürmeden önce, aşağıda verilen kalite kuralları dosyalarındaki (question-generation.md, question-quality.md) 100 puanlık rubriğe göre kendi içinde puanla ve sonucu 'quality_score' alanında ver; 80'in altında puanladığın bir soruyu iyileştirip yeniden dene, olmuyorsa hiç döndürme (setten eksik geçmesi, kötü bir soru döndürmekten iyidir).\n\n" +
        "=== SORU HAZIRLAMA VE KALİTE KURALLARI (proje politikası) ===\n" +
        loadQuestionPolicyDocs(),
      messages: [
        {
          role: "user",
          content: `Ders: ${subjectName ?? "belirtilmedi"}
Konu: ${topicName} (${gradeLevel ? gradeLevel + ". sınıf" : "genel"})
Sınav türü: ${examTypes.join(", ") || "genel"}
Zorluk kademesi: ${DIFFICULTY_LABELS[difficulty]} — ${DIFFICULTY_PROMPT_HINTS[difficulty]}
Üretilecek soru sayısı: ${count}${referenceBlock}

Aşağıdaki JSON formatında ve SADECE JSON dizisi döndür:
[
  {
    "body": "soru metni",
    "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
    "correct_option": "A",
    "explanation": "doğru cevabın neden doğru olduğunu adım adım açıklayan çözüm - öğrenci bunu okuyunca mantığı tam anlamalı",
    "option_error_tags": {"B": "hangi somut hatayı yaptığı için bu şıkkı işaretler", "C": "...", "D": "..."},
    "quality_score": 0,
    "cognitive_level": "Hatırlama" | "Anlama" | "Uygulama" | "Analiz" | "Değerlendirme" | "Üst düzey düşünme",
    "question_type": "soru tipi (ör. paragraf, problem çözme, tablo yorumlama, çıkarım, günlük yaşam...)"
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

export type ExamParseCandidateTopic = { id: string; name: string; grade_level: number | null; subject_name: string };

export type ExamParsedQuestion = {
  body: string;
  options: { A: string; B: string; C: string; D: string };
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
  topic_id: string | null;
  topic_guess_label: string;
  confidence: "high" | "medium" | "low";
};

export type ExamParseResult = {
  questions: ExamParsedQuestion[];
  skipped: string[];
};

const FALLBACK_EXAM_PARSE: ExamParseResult = { questions: [], skipped: [] };

/**
 * Admin'in Soru Havuzu ekranina PDF'den kopyala-yapistirdigi HAM sinav
 * metnini (ÖSYM tarzi, PDF cikarma kaynakli bozuk bosluklar/satir
 * kirilmalari icerebilir, "Soru:"/"A)"/"Cevap:" gibi sabit bir format
 * TAKIP ETMEZ) tek tek sorulara ayirir, her soruyu verilen konu
 * katalogundaki EN UYGUN konuya siniflandirir (bkz. kullanicinin "konu
 * konu dagitmayi da sistem otomatik yapmali" talebi) ve bir cozum
 * aciklamasi yazar. answerKeyText verilirse (ÖSYM cevap anahtari, orn.
 * "1. B 2. D 3. A ...") dogru cevaplar ORADAN alinir - verilmezse AI
 * kendi bilgisiyle en olasi cevabi isaretler ve confidence="low" doner,
 * boylece admin kaydetmeden once gozden gecirebilir. Sekil/grafik/tablo
 * GEREKTIREN ya da govdesi eksik kalan sorular "skipped" listesine
 * aciklamayla dusurulur, uydurulmaz.
 */
export async function parseExamText(params: {
  rawText: string;
  answerKeyText?: string;
  candidateTopics: ExamParseCandidateTopic[];
}): Promise<ExamParseResult> {
  const { rawText, answerKeyText, candidateTopics } = params;

  const topicCatalog = candidateTopics
    .map((t) => `${t.id} | ${t.subject_name} | ${t.grade_level ? t.grade_level + ". sınıf" : "genel"} | ${t.name}`)
    .join("\n");

  let message;
  try {
    message = await anthropic.messages.create({
      model: AI_MODEL,
      // Bir sinav kagidi 40 soruya kadar cikabiliyor - her soru icin govde +
      // 4 sik + aciklama + siniflandirma alanlari yazdirmak kolayca 16.000
      // token'i asiyordu, cikti kesiliyordu, JSON bozuk geliyordu ve
      // (hicbir soru kurtarilamadigi icin) kullaniciya "hic soru
      // cikarilamadi" olarak donuyordu - "pdf yukleniyor ama sorular
      // gelmiyor" sikayetinin asil nedeni buydu. Sinirin (Sonnet 4.5'in
      // destekledigi ust sinira yakin) yukseltilmesi buyuk sinavlarin da
      // tek seferde sigmasini saglar; asagidaki 8. kural da aciklamalari
      // kisa tutturarak soru basina token tuketimini azaltir.
      max_tokens: 64000,
      system:
        "Sen Türkiye'deki ÖSYM ve benzeri sınav kağıtlarını dijitalleştiren, çok titiz bir veri işleme editörüsün. " +
        "Sana PDF'den kopyalanmış, bozuk boşluklu/satır kırılmalı HAM sınav metni verilecek. Görevin bunu tek tek " +
        "sorulara ayırmak, her birini en uygun konuya sınıflandırmak ve SADECE JSON döndürmek. Kurallar:\n" +
        "1) HAM metin, PDF çıkarımından kaynaklanan bozuk boşluklarla gelebilir - kelimelerin ortasına gereksiz boşluk girmiş olabilir (ör. 's ırası yla' aslında 'sırasıyla', 'ce vap kâ ğıdını n' aslında 'cevap kâğıdının' demek) ya da satır kırılmaları kelimeleri bölmüş olabilir. Bunları BAĞLAMA bakarak doğru, normal, okunabilir Türkçeye çevir - hangi harflerin bir kelimeyi oluşturduğunu anlam ve dil bilgisinden çıkar. İçeriği ASLA değiştirme, sadece biçimini/boşluklarını düzelt.\n" +
        "2) Şekil, grafik, tablo, harita ya da görsel GEREKTİREN sorular metinle çözülemeyeceği için 'skipped' listesine kısa bir sebeple ekle, questions'a KOYMA.\n" +
        "3) Bir soru veya şıkları eksik/kopuk geldiyse (PDF kesintisi) onu da 'skipped' listesine ekle, eksik kısmı UYDURMA.\n" +
        "4) Cevap anahtarı verildiyse doğru cevabı SADECE oradan al ve confidence='high' ver. Verilmediyse kendi bilgi/akıl yürütmenle en olası cevabı işaretle ve confidence='low' ver (admin kaydetmeden önce gözden geçirecek).\n" +
        "5) Her soru için doğru cevabın neden doğru olduğunu kısaca açıklayan bir 'explanation' yaz (boş bırakma).\n" +
        "6) Aşağıdaki konu kataloğundan (id | ders | sınıf | konu adı) İÇERİĞE EN UYGUN OLAN TEK konunun id'sini topic_id olarak ver; hiçbiri gerçekten uymuyorsa topic_id=null bırak ve topic_guess_label'a tahmini konu adını yaz.\n" +
        "7) Metindeki telif/kurum başlıkları (ör. 'T.C. Ölçme, Seçme ve Yerleştirme Merkezi', sınav adı, tarih) SORU DEĞİLDİR, atla.\n" +
        "8) Metinde çok sayıda soru varsa (ör. tam bir sınav kitapçığı) 'explanation' alanını KISA tut (1-3 cümle, doğru cevabın mantığını versin yeterli) - amaç çıktının tamamının kesilmeden sığması, uzun uzun anlatma.",
      messages: [
        {
          role: "user",
          content: `KONU KATALOĞU (id | ders | sınıf | konu adı):
${topicCatalog || "(katalog boş)"}

${answerKeyText?.trim() ? `CEVAP ANAHTARI:\n${answerKeyText.trim()}\n\n` : ""}HAM SINAV METNİ:
${rawText}

Aşağıdaki JSON formatında ve SADECE JSON döndür:
{
  "questions": [
    {
      "body": "düzeltilmiş soru metni",
      "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
      "correct_option": "A",
      "explanation": "doğru cevabın neden doğru olduğu",
      "topic_id": "katalogdaki id ya da null",
      "topic_guess_label": "topic_id null ise tahmini konu adı, değilse katalogdaki konu adı",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "skipped": ["atlanan soru/parça ve kısa sebebi"]
}`,
        },
      ],
    });
  } catch (err) {
    console.error("parseExamText: anthropic isteği başarısız", err);
    return FALLBACK_EXAM_PARSE;
  }

  if (message.stop_reason === "max_tokens") {
    console.warn("parseExamText: yanit max_tokens sinirinda kesildi, kismi kurtarma denenecek");
  }

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return {
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      skipped: Array.isArray(parsed.skipped) ? parsed.skipped : [],
    };
  } catch (err) {
    // Cikti (uzun bir sinav yuzunden max_tokens'a takilip) yarim kesilmis
    // olabilir - JSON.parse tum govdeyi tek parca istedigi icin boyle bir
    // durumda HER SEYI atip kullaniciya "hic soru cikarilamadi" demek
    // israf: bunun yerine "questions" dizisindeki TAMAMLANMIS (kapanan
    // suslu parantezli) soru nesnelerini teker teker kurtarmaya calisiyoruz,
    // son (yarim kalmis) soruyu sessizce atlariz.
    console.error("parseExamText: JSON tam ayrıştırılamadı, kısmi kurtarma deneniyor", err);
    const salvaged = salvageCompleteObjectsFromArray(raw, "questions");
    if (salvaged.length > 0) {
      return {
        questions: salvaged as ExamParsedQuestion[],
        skipped: ["Yanıt kesildiği için son bir kısım soru kurtarılamadı - kalanları ayrı bir seferde tekrar dene."],
      };
    }
    return FALLBACK_EXAM_PARSE;
  }
}

// Verilen JSON metninde `"<arrayKey>": [ {...}, {...}, ... ]` seklindeki bir
// dizinin icindeki TAMAMLANMIS (acilan/kapanan suslu parantezleri esit
// sayida olan) nesneleri sirayla parse edip dondurur; dizi kesilmisse (son
// nesne yarim kalmissa) o son nesneyi sessizce atlar. String icindeki
// suslu parantezleri/kacis karakterlerini dogru sayabilmek icin basit bir
// durum makinesi kullanir.
function salvageCompleteObjectsFromArray(raw: string, arrayKey: string): unknown[] {
  const keyIndex = raw.indexOf(`"${arrayKey}"`);
  if (keyIndex === -1) return [];
  const bracketStart = raw.indexOf("[", keyIndex);
  if (bracketStart === -1) return [];

  const results: unknown[] = [];
  let i = bracketStart + 1;
  while (i < raw.length) {
    while (i < raw.length && /[\s,]/.test(raw[i])) i++;
    if (i >= raw.length || raw[i] === "]") break;
    if (raw[i] !== "{") break;

    let depth = 0;
    let inString = false;
    let escape = false;
    let j = i;
    for (; j < raw.length; j++) {
      const c = raw[j];
      if (inString) {
        if (escape) escape = false;
        else if (c === "\\") escape = true;
        else if (c === '"') inString = false;
      } else if (c === '"') {
        inString = true;
      } else if (c === "{") {
        depth++;
      } else if (c === "}") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    if (depth !== 0) break; // nesne yarim kalmis (kesilmis) - burada dur

    try {
      results.push(JSON.parse(raw.slice(i, j)));
    } catch {
      // tekil nesne bile bozuksa atla, digerlerini kurtarmaya devam et
    }
    i = j;
  }
  return results;
}
