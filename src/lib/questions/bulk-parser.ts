// Kopyala-yapistir ya da dosyadan (docx/pdf/txt) gelen metni sorulara ayiran,
// hicbir AI/API kullanmayan (ucretsiz) basit ama esnek bir ayristirici.
//
// Beklenen format (her soru bos satirla ayrilir):
//
//   Soru: Bir üçgenin iç açıları toplamı kaç derecedir?
//   A) 90
//   B) 180
//   C) 270
//   D) 360
//   Cevap: B
//   Açıklama: Üçgende iç açılar toplamı her zaman 180 derecedir. (ZORUNLU)
//
//   Soru: ikinci soru...
//   ...
//
// Açıklama satırı zorunludur: her sorunun dogru cevabinin NEDEN dogru
// oldugunu anlatan bir metin olmadan soru kaydedilemez (bkz. CLAUDE.md
// "Soru cevap açıklaması kuralı").

export type ParsedQuestion = {
  body: string;
  options: { A: string; B: string; C: string; D: string };
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
};

export type ParseResult = {
  questions: ParsedQuestion[];
  errors: string[];
};

const QUESTION_START = /^\s*(?:\d+[.)]\s*)?soru\s*:?\s*(.*)$/i;
const OPTION_LINE = /^\s*([A-D])\s*[).:]\s*(.+)$/i;
const ANSWER_LINE = /^\s*cevap\s*:?\s*([A-D])/i;
const EXPLANATION_LINE = /^\s*(a[çc]iklama|çözüm|cozum)\s*:?\s*(.+)$/i;

export function parseQuestionsText(raw: string): ParseResult {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (QUESTION_START.test(line)) {
      if (current.length) blocks.push(current);
      current = [line];
    } else if (line.trim() === "" && current.length === 0) {
      // basliktan once bos satirlar - yoksay
      continue;
    } else if (current.length) {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];

  blocks.forEach((block, index) => {
    const label = `Soru ${index + 1}`;
    const bodyParts: string[] = [];
    const options: Partial<Record<"A" | "B" | "C" | "D", string>> = {};
    let correct: string | null = null;
    let explanation: string | null = null;

    for (const line of block) {
      const startMatch = QUESTION_START.exec(line);
      const optionMatch = OPTION_LINE.exec(line);
      const answerMatch = ANSWER_LINE.exec(line);
      const explanationMatch = EXPLANATION_LINE.exec(line);

      if (startMatch) {
        if (startMatch[1]?.trim()) bodyParts.push(startMatch[1].trim());
      } else if (answerMatch) {
        correct = answerMatch[1].toUpperCase();
      } else if (explanationMatch) {
        explanation = explanationMatch[2].trim();
      } else if (optionMatch) {
        const key = optionMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
        options[key] = optionMatch[2].trim();
      } else if (line.trim()) {
        // secenek/cevap olmayan ekstra satir - soru govdesine ekle
        bodyParts.push(line.trim());
      }
    }

    const body = bodyParts.join(" ").trim();
    const missing: string[] = [];
    if (!body) missing.push("soru metni");
    (["A", "B", "C", "D"] as const).forEach((k) => {
      if (!options[k]) missing.push(`${k} şıkkı`);
    });
    if (!correct) missing.push("doğru cevap (Cevap: X)");
    if (!explanation?.trim()) missing.push("çözüm açıklaması (Açıklama: ... — zorunlu)");

    if (missing.length) {
      errors.push(`${label}: eksik alan(lar) - ${missing.join(", ")}`);
      return;
    }

    questions.push({
      body,
      options: { A: options.A!, B: options.B!, C: options.C!, D: options.D! },
      correct_option: correct as "A" | "B" | "C" | "D",
      explanation: explanation!.trim(),
    });
  });

  if (!blocks.length) {
    errors.push('Hiç soru bulunamadı. Her sorunun "Soru:" ile başladığından emin ol.');
  }

  return { questions, errors };
}

// "Ders ders" / konu konu toplu ekleme: metin icinde "Konu: <konu adi>"
// basliklariyla birden fazla konunun sorulari tek seferde yapistirilabilir.
// Baslik yoksa (eski davranis) butun metin tek bir bolum sayilir ve
// cagiran taraf (ör. o an ekranda secili konu) varsayilan olarak kullanilir.
//
//   Konu: Üçgende Açılar
//   Soru: ...
//   ...
//
//   Konu: Dörtgenler
//   Soru: ...
//   ...

export type TopicSection = {
  /** "Konu:" basligindan gelen ham metin, baslik yoksa null. */
  topicName: string | null;
  result: ParseResult;
};

const TOPIC_HEADER = /^\s*konu\s*:\s*(.+)$/i;

export function parseQuestionsByTopic(raw: string): TopicSection[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");

  const sections: { topicName: string | null; lines: string[] }[] = [];
  let current: { topicName: string | null; lines: string[] } | null = null;

  for (const line of lines) {
    const topicMatch = TOPIC_HEADER.exec(line);
    if (topicMatch) {
      if (current) sections.push(current);
      current = { topicName: topicMatch[1].trim(), lines: [] };
    } else {
      if (!current) current = { topicName: null, lines: [] };
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  return sections
    .filter((s) => s.lines.some((l) => l.trim()))
    .map((s) => ({ topicName: s.topicName, result: parseQuestionsText(s.lines.join("\n")) }));
}
