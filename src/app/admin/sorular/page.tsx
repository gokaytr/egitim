import { createClient } from "@/lib/supabase/server";
import { SimpleTabs } from "@/components/simple-tabs";
import { QuestionAddScreen } from "@/components/question-add-screen";
import { SubjectAddForm } from "@/components/subject-add-form";
import { CourseManager } from "@/components/course-manager";
import { TopicAddForm } from "@/components/topic-add-form";
import { CurriculumBrowser, type CurriculumTopicRow } from "@/components/curriculum-browser";
import { PendingQuestionsBrowser } from "@/components/pending-questions-browser";
import { AllQuestionsBrowser } from "@/components/all-questions-browser";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

// Eskiden "Soru Ekle", "Soru Onayı" ve "Sorular" (tum liste) admin menusunde
// ayri ayri sayfalardi - artik tek bir "Sorular" sayfasi altinda uc sekme
// olarak birlestirildi, boylece soru is akisinin tamami (ekle -> onayla ->
// goz at) tek yerden yonetiliyor.
export default async function SorularPage() {
  const supabase = await createClient();

  const [{ data: subjects }, { data: courses }, { data: rawTopics }, { data: pending }, { data: allQuestions }] =
    await Promise.all([
      supabase.from("subjects").select("id, name").order("name"),
      supabase.from("courses").select("id, name").order("name"),
      supabase
        .from("topics")
        .select("id, name, kazanim, grade_level, exam_types, subject_id, subjects(name)")
        .order("grade_level"),
      supabase
        .from("questions")
        .select("id, body, options, correct_option, source, difficulty, topic_id")
        .eq("is_approved", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("questions")
        .select("id, body, options, correct_option, is_approved, source, difficulty, topic_id")
        .order("created_at", { ascending: false }),
    ]);

  const curriculumTopics: CurriculumTopicRow[] = (rawTopics ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    kazanim: t.kazanim,
    grade_level: t.grade_level,
    exam_types: t.exam_types,
    subjectName: firstOf(t.subjects)?.name ?? "Diğer",
  }));

  const browserTopics = (rawTopics ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    grade_level: t.grade_level,
    subject_id: t.subject_id,
    subject_name: firstOf(t.subjects)?.name ?? "Diğer",
  }));

  const pendingQuestions = (pending ?? []).map((q) => ({
    id: q.id,
    body: q.body,
    options: (q.options ?? {}) as Record<string, string>,
    correct_option: q.correct_option,
    source: q.source,
    difficulty: q.difficulty,
    topic_id: q.topic_id,
  }));

  const allQuestionsMapped = (allQuestions ?? []).map((q) => ({
    id: q.id,
    body: q.body,
    options: (q.options ?? {}) as Record<string, string>,
    correct_option: q.correct_option,
    is_approved: q.is_approved,
    source: q.source,
    difficulty: q.difficulty,
    topic_id: q.topic_id,
  }));

  const curriculumTab = (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SubjectAddForm />
        <CourseManager courses={courses ?? []} />
      </div>
      <TopicAddForm subjects={subjects ?? []} courses={courses ?? []} />
      <CurriculumBrowser topics={curriculumTopics} />
    </div>
  );

  const soruEkleTab = (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-500">
        Önce müfredat/konu ekleyin, sonra elle soru ekleyin veya kopyala-yapıştır ile ya da PDF/Word dosyası
        yükleyerek toplu soru içe aktarın.
      </p>
      <QuestionAddScreen showAiTab curriculumTab={curriculumTab} />
    </div>
  );

  const soruOnayTab = (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-500">
        Yapay zekanın ürettiği sorular, öğrencilere gösterilmeden önce burada onaylanır. Onay bekleyen soru bulunan
        sınıf, ders ve konularda turuncu bir ışık yanar.
      </p>
      <PendingQuestionsBrowser topics={browserTopics} questions={pendingQuestions} />
    </div>
  );

  const sorularListesiTab = (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-500">
        Sistemdeki tüm sorular — onaylı ve onay bekleyenler dahil — sınıf, ders ve konuya göre gruplu.
      </p>
      <AllQuestionsBrowser topics={browserTopics} questions={allQuestionsMapped} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sorular</h1>
        <p className="text-sm text-slate-500">Soru ekleme, onaylama ve tüm soruları görüntüleme tek ekranda.</p>
      </div>

      <SimpleTabs
        defaultKey="ekle"
        tabs={[
          { key: "ekle", label: "Soru Ekle", content: soruEkleTab },
          { key: "onay", label: "Soru Onayı", content: soruOnayTab, dot: pendingQuestions.length > 0 },
          { key: "liste", label: "Tüm Sorular", content: sorularListesiTab },
        ]}
      />
    </div>
  );
}
