import type { SupabaseClient } from "@supabase/supabase-js";
import { LEVEL_TO_DIFFICULTY, type LevelLabel } from "@/lib/deneme/level";

// "Deneme" (rastgele/onerilen) ve "Seviye Tespit Sinavi" ekranlarinin
// arkasindaki ortak montaj mantigi: ogrencinin sinif seviyesine kadar olan
// konulardan onayli sorulari toplar, karistirir/zorluga gore siralar, ve
// exams + exam_questions tablolarina (RLS geregi sadece admin client ile
// yazilabilir - bu yuzden bu fonksiyon her zaman service-role client ile
// cagrilmali) yeni bir deneme kaydi olusturur.

export type DenemeMode = "seviye_tespit" | "rastgele" | "onerilen";

const COUNT_BY_MODE: Record<DenemeMode, number> = {
  seviye_tespit: 12,
  rastgele: 15,
  onerilen: 15,
};

const MIN_POOL = 4;

type AssembleInput = {
  studentId: string;
  gradeLevel: number | null;
  examTarget: string | null;
  mode: DenemeMode;
  levelLabel?: LevelLabel | null;
};

type AssembleResult =
  | { examId: string; title: string; questionCount: number }
  | { error: string };

function titleFor(mode: DenemeMode, grade: number): string {
  const tarih = new Date().toLocaleDateString("tr-TR");
  if (mode === "seviye_tespit") return `${grade}. Sınıf Seviye Tespit Sınavı — ${tarih}`;
  if (mode === "onerilen") return `${grade}. Sınıf Sana Özel Deneme — ${tarih}`;
  return `${grade}. Sınıf Rastgele Deneme — ${tarih}`;
}

export async function assembleDeneme(admin: SupabaseClient, input: AssembleInput): Promise<AssembleResult> {
  const grade = input.gradeLevel ?? 9;

  const { data: topics } = await admin
    .from("topics")
    .select("id")
    .lte("grade_level", grade);

  const topicIds = (topics ?? []).map((t) => t.id as string);
  if (topicIds.length === 0) {
    return { error: "Henüz müfredatında konu tanımlı değil, deneme oluşturulamadı." };
  }

  const { data: questions } = await admin
    .from("questions")
    .select("id, topic_id, difficulty")
    .in("topic_id", topicIds)
    .eq("is_approved", true);

  const pool = questions ?? [];
  if (pool.length < MIN_POOL) {
    return { error: "Şu anda seviyene uygun yeterli onaylı soru yok, yakında eklenecek." };
  }

  let ordered: typeof pool;
  if (input.mode === "onerilen" && input.levelLabel) {
    const target = LEVEL_TO_DIFFICULTY[input.levelLabel] ?? 3;
    ordered = [...pool].sort((a, b) => {
      const da = Math.abs((a.difficulty ?? 3) - target);
      const db = Math.abs((b.difficulty ?? 3) - target);
      return da - db || Math.random() - 0.5;
    });
  } else {
    ordered = [...pool].sort(() => Math.random() - 0.5);
  }

  // Ayni konudan art arda soru gelmesin diye konu bazinda round-robin secim.
  const byTopic = new Map<string, typeof pool>();
  for (const q of ordered) {
    const list = byTopic.get(q.topic_id) ?? [];
    list.push(q);
    byTopic.set(q.topic_id, list);
  }
  const topicQueues = [...byTopic.values()];
  const selected: typeof pool = [];
  const targetCount = Math.min(COUNT_BY_MODE[input.mode], pool.length);
  let i = 0;
  while (selected.length < targetCount) {
    const queue = topicQueues[i % topicQueues.length];
    if (queue.length > 0) selected.push(queue.shift()!);
    i++;
    if (topicQueues.every((q) => q.length === 0)) break;
  }

  const { data: exam, error: examError } = await admin
    .from("exams")
    .insert({
      title: titleFor(input.mode, grade),
      exam_type: input.mode === "seviye_tespit" ? "seviye_tespit" : "deneme",
      grade_level: grade,
      exam_target: input.examTarget,
      duration_minutes: Math.max(10, selected.length * 2),
      created_by: input.studentId,
    })
    .select("id, title")
    .single();

  if (examError || !exam) {
    return { error: examError?.message ?? "Deneme kaydedilemedi." };
  }

  const { error: linkError } = await admin.from("exam_questions").insert(
    selected.map((q, idx) => ({ exam_id: exam.id, question_id: q.id, order_index: idx }))
  );

  if (linkError) {
    return { error: linkError.message };
  }

  return { examId: exam.id, title: exam.title, questionCount: selected.length };
}
