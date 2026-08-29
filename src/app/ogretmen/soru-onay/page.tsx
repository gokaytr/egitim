import { createClient } from "@/lib/supabase/server";
import { PendingQuestionsBrowser } from "@/components/pending-questions-browser";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export default async function OgretmenSoruOnayPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: subjectRows } = await supabase
    .from("teacher_subjects")
    .select("subject_id, subjects(name)")
    .eq("teacher_id", userData.user?.id ?? "");
  const subjectIds = (subjectRows ?? []).map((r) => r.subject_id);

  let topics: { id: string; name: string; grade_level: number | null; subject_id: string; subject_name: string }[] = [];
  let questions: {
    id: string;
    body: string;
    options: Record<string, string>;
    correct_option: string;
    source: string;
    difficulty: number | null;
    topic_id: string;
  }[] = [];

  if (subjectIds.length > 0) {
    const [{ data: rawTopics }, { data: pending }] = await Promise.all([
      supabase.from("topics").select("id, name, grade_level, subject_id, subjects(name)").in("subject_id", subjectIds),
      supabase
        .from("questions")
        .select("id, body, options, correct_option, source, difficulty, topic_id, topics!inner(subject_id)")
        .eq("is_approved", false)
        .in("topics.subject_id", subjectIds)
        .order("created_at", { ascending: false }),
    ]);

    topics = (rawTopics ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      grade_level: t.grade_level,
      subject_id: t.subject_id,
      subject_name: firstOf(t.subjects)?.name ?? "Diğer",
    }));

    questions = (pending ?? []).map((q) => ({
      id: q.id,
      body: q.body,
      options: (q.options ?? {}) as Record<string, string>,
      correct_option: q.correct_option,
      source: q.source,
      difficulty: q.difficulty,
      topic_id: q.topic_id,
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Soru Onayı</h1>
        <p className="text-sm text-slate-500">
          Yapay zekanın sizin branşınızda ürettiği sorular, öğrencilere gösterilmeden önce burada onaylanır. Onay
          bekleyen soru bulunan sınıf, ders ve konularda turuncu bir ışık yanar.
        </p>
      </div>

      {subjectIds.length === 0 ? (
        <p className="text-sm text-amber-700">
          Size henüz bir branş atanmamış. Soru onaylayabilmeniz için admin panelinden bir branş atanması gerekiyor.
        </p>
      ) : (
        <PendingQuestionsBrowser topics={topics} questions={questions} />
      )}
    </div>
  );
}