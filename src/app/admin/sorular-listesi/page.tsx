import { createClient } from "@/lib/supabase/server";
import { AllQuestionsBrowser } from "@/components/all-questions-browser";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export default async function SorularListesiPage() {
  const supabase = await createClient();

  const [{ data: rawTopics }, { data: questions }] = await Promise.all([
    supabase.from("topics").select("id, name, grade_level, subject_id, subjects(name)"),
    supabase
      .from("questions")
      .select("id, body, options, correct_option, is_approved, source, difficulty, topic_id")
      .order("created_at", { ascending: false }),
  ]);

  const topics = (rawTopics ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    grade_level: t.grade_level,
    subject_id: t.subject_id,
    subject_name: firstOf(t.subjects)?.name ?? "Diğer",
  }));

  const mappedQuestions = (questions ?? []).map((q) => ({
    id: q.id,
    body: q.body,
    options: (q.options ?? {}) as Record<string, string>,
    correct_option: q.correct_option,
    is_approved: q.is_approved,
    source: q.source,
    difficulty: q.difficulty,
    topic_id: q.topic_id,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sorular</h1>
        <p className="text-sm text-slate-500">
          Sistemdeki tüm sorular — onaylı ve onay bekleyenler dahil — sınıf, ders ve konuya göre gruplu.
        </p>
      </div>
      <AllQuestionsBrowser topics={topics} questions={mappedQuestions} />
    </div>
  );
}
