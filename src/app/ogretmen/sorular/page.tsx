import { createClient } from "@/lib/supabase/server";
import { QuestionTopicPanel, type PanelTopic } from "@/components/question-topic-panel";
import { resolveEffectiveTeacher } from "@/lib/teacher/effective-teacher";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

// Adminle ayni basitlestirilmis yaklasim: grid/sekme yok, sinif -> ders ->
// (sinav) -> konu sekmeli secici ile TEK bir konu seciliyor, o konunun
// sorulari + ekleme + onaylama ayni yerde. Ogretmen "Soru Havuzu" ve
// "Paylasim"i gormez - bunlar sadece admin panelinde.
export default async function OgretmenSorularPage({
  searchParams,
}: {
  searchParams: Promise<{ teacherId?: string }>;
}) {
  const { teacherId: requestedTeacherId } = await searchParams;
  const supabase = await createClient();
  const { teacherId: effectiveTeacherId } = await resolveEffectiveTeacher(requestedTeacherId);
  const { data: subjectRows } = await supabase
    .from("teacher_subjects")
    .select("subject_id, subjects(name)")
    .eq("teacher_id", effectiveTeacherId ?? "");
  const subjectIds = (subjectRows ?? []).map((r) => r.subject_id);
  const teacherSubjects = (subjectRows ?? []).map((r) => ({
    id: r.subject_id,
    name: firstOf(r.subjects)?.name ?? "Diğer",
  }));

  let topics: PanelTopic[] = [];
  const counts = new Map<string, number>();

  if (subjectIds.length > 0) {
    const [{ data: rawTopics }, { data: countRows }] = await Promise.all([
      supabase
        .from("topics")
        .select("id, name, grade_level, subject_id, exam_types, target_question_count, subjects(name)")
        .in("subject_id", subjectIds),
      supabase
        .from("questions")
        .select("topic_id, topics!inner(subject_id)")
        .eq("is_reference_only", false)
        .in("topics.subject_id", subjectIds),
    ]);

    topics = (rawTopics ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      grade_level: t.grade_level,
      subject_id: t.subject_id,
      subject_name: firstOf(t.subjects)?.name ?? "Diğer",
      exam_types: t.exam_types,
      target_question_count: t.target_question_count,
    }));

    (countRows ?? []).forEach((q) => {
      if (!q.topic_id) return;
      counts.set(q.topic_id, (counts.get(q.topic_id) ?? 0) + 1);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sorular</h1>
        <p className="text-sm text-slate-500">
          Bir konu seç; o konunun soruları, ekleme ve onaylama seçenekleriyle birlikte aşağıda açılır.
        </p>
      </div>

      {subjectIds.length === 0 ? (
        <p className="text-sm text-amber-700">
          Size henüz bir branş atanmamış. Admin panelinden bir branş atanması gerekiyor.
        </p>
      ) : (
        <QuestionTopicPanel topics={topics} counts={counts} subjects={teacherSubjects} subjectIds={subjectIds} isAdmin={false} />
      )}
    </div>
  );
}
