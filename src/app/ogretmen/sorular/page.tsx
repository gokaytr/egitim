import { createClient } from "@/lib/supabase/server";
import { SimpleTabs } from "@/components/simple-tabs";
import { QuestionAddScreen } from "@/components/question-add-screen";
import { PendingQuestionsBrowser } from "@/components/pending-questions-browser";
import { AllQuestionsBrowser } from "@/components/all-questions-browser";
import { resolveEffectiveTeacher } from "@/lib/teacher/effective-teacher";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

// Soru Ekle ve Soru Onayi, ogretmen menusunde de tek bir "Sorular" sayfasi
// altinda iki sekme olarak birlestirildi (admin panelindeki ayni birlestirme
// ile tutarli).
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
  let allQuestions: {
    id: string;
    body: string;
    options: Record<string, string>;
    correct_option: string;
    is_approved: boolean;
    source: string;
    difficulty: number | null;
    topic_id: string;
  }[] = [];

  if (subjectIds.length > 0) {
    const [{ data: rawTopics }, { data: pending }, { data: all }] = await Promise.all([
      supabase.from("topics").select("id, name, grade_level, subject_id, subjects(name)").in("subject_id", subjectIds),
      supabase
        .from("questions")
        .select("id, body, options, correct_option, source, difficulty, topic_id, topics!inner(subject_id)")
        .eq("is_approved", false)
        .in("topics.subject_id", subjectIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("questions")
        .select("id, body, options, correct_option, is_approved, source, difficulty, topic_id, topics!inner(subject_id)")
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

    allQuestions = (all ?? []).map((q) => ({
      id: q.id,
      body: q.body,
      options: (q.options ?? {}) as Record<string, string>,
      correct_option: q.correct_option,
      is_approved: q.is_approved,
      source: q.source,
      difficulty: q.difficulty,
      topic_id: q.topic_id,
    }));
  }

  const soruEkleTab = (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-500">
        Elle soru ekleyin veya kopyala-yapıştır ile ya da PDF/Word dosyası yükleyerek toplu soru içe aktarın.
      </p>
      <QuestionAddScreen />
    </div>
  );

  const soruOnayTab = (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-500">
        Yapay zekanın sizin branşınızda ürettiği sorular, öğrencilere gösterilmeden önce burada onaylanır. Onay
        bekleyen soru bulunan sınıf, ders ve konularda turuncu bir ışık yanar.
      </p>
      {subjectIds.length === 0 ? (
        <p className="text-sm text-amber-700">
          Size henüz bir branş atanmamış. Soru onaylayabilmeniz için admin panelinden bir branş atanması gerekiyor.
        </p>
      ) : (
        <PendingQuestionsBrowser topics={topics} questions={questions} />
      )}
    </div>
  );

  const sorularListesiTab = (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-500">
        Branşınızdaki tüm sorular — onaylı ve onay bekleyenler dahil — sınıf, ders ve konuya göre gruplu.
      </p>
      {subjectIds.length === 0 ? (
        <p className="text-sm text-amber-700">
          Size henüz bir branş atanmamış. Soru görebilmeniz için admin panelinden bir branş atanması gerekiyor.
        </p>
      ) : (
        <AllQuestionsBrowser topics={topics} questions={allQuestions} />
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sorular</h1>
        <p className="text-sm text-slate-500">Soru ekleme, onaylama ve tüm soruları görüntüleme tek ekranda.</p>
      </div>

      <SimpleTabs
        defaultKey="liste"
        tabs={[
          { key: "liste", label: "Tüm Sorular", content: sorularListesiTab },
          { key: "ekle", label: "Soru Ekle", content: soruEkleTab, tone: "indigo" },
          { key: "onay", label: "Soru Onayı", content: soruOnayTab, dot: questions.length > 0, tone: "amber" },
        ]}
      />
    </div>
  );
}
