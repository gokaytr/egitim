import { createClient } from "@/lib/supabase/server";
import { PendingQuestionsBrowser } from "@/components/pending-questions-browser";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export default async function SoruOnayPage() {
  const supabase = await createClient();

  const [{ data: rawTopics }, { data: pending }] = await Promise.all([
    supabase.from("topics").select("id, name, grade_level, subject_id, subjects(name)"),
    supabase
      .from("questions")
      .select("id, body, options, correct_option, source, difficulty, topic_id")
      .eq("is_approved", false)
      .order("created_at", { ascending: false }),
  ]);

  const topics = (rawTopics ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    grade_level: t.grade_level,
    subject_id: t.subject_id,
    subject_name: firstOf(t.subjects)?.name ?? "Diğer",
  }));

  const questions = (pending ?? []).map((q) => ({
    id: q.id,
    body: q.body,
    options: (q.options ?? {}) as Record<string, string>,
    correct_option: q.correct_option,
    source: q.source,
    difficulty: q.difficulty,
    topic_id: q.topic_id,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Soru Onayı</h1>
        <p className="text-sm text-slate-500">
          Yapay zekanın ürettiği sorular, öğrencilere gösterilmeden önce burada onaylanır. Onay bekleyen soru bulunan
          sınıf, ders ve konularda turuncu bir ışık yanar.
        </p>
      </div>

      <PendingQuestionsBrowser topics={topics} questions={questions} />
    </div>
  );
}