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
        .select("id, body, options, correct_option, explanation, source, difficulty, topic_id")
        .eq("is_approved", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("questions")
        .select("id, body, options, correct_option, explanation, is_approved, source, difficulty, topic_id, is_reference_only")
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
    explanation: q.explanation,
    source: q.source,
    difficulty: q.difficulty,
    topic_id: q.topic_id,
  }));

  const allQuestionsMapped = (allQuestions ?? []).map((q) => ({
    id: q.id,
    body: q.body,
    options: (q.options ?? {}) as Record<string, string>,
    correct_option: q.correct_option,
    explanation: q.explanation,
    is_approved: q.is_approved,
    source: q.source,
    difficulty: q.difficulty,
    topic_id: q.topic_id,
    is_reference_only: q.is_reference_only,
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
        Yapay zekanın ürettiği sorular öğrencilere hemen yayınlanır; burada yapılan onay sorunun görünürlüğünü değil
        kalite kontrolünü (öğretmen/admin incelemesinden geçti mi) belirler. İncelenmemiş soru bulunan sınıf, ders ve
        konularda turuncu bir ışık yanar.
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
        <p className="mt-2 text-sm font-medium text-slate-600">
          🔒 Not: &quot;Soru Havuzu&quot; sekmesindeki <span className="font-semibold">Referans Havuzu</span> pilinde
          tutulan sorular öğrenciye ASLA gösterilmez/yayınlanmaz — sadece yapay zekânın örnek alması için saklanır.
        </p>
      </div>

      <SimpleTabs
        defaultKey="ekle"
        syncQueryParam="tab"
        tabs={[
          { key: "ekle", label: "Soru Ekle", content: soruEkleTab, tone: "indigo" },
          { key: "onay", label: "Soru Onayla", content: soruOnayTab, dot: pendingQuestions.length > 0, tone: "amber" },
          { key: "havuz", label: "Soru Havuzu", content: sorularListesiTab },
        ]}
      />
    </div>
  );
}
