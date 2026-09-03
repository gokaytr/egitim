import { createClient } from "@/lib/supabase/server";
import { SimpleTabs } from "@/components/simple-tabs";
import { SubjectAddForm } from "@/components/subject-add-form";
import { CourseManager } from "@/components/course-manager";
import { TopicAddForm } from "@/components/topic-add-form";
import { CurriculumBrowser, type CurriculumTopicRow } from "@/components/curriculum-browser";
import { ReferencePoolFiles } from "@/components/reference-pool-files";
import { ReferencePoolAddPanel } from "@/components/reference-pool-add-panel";
import { ReferencePoolBrowser } from "@/components/reference-pool-browser";
import { QuestionTopicPanel, type PanelTopic } from "@/components/question-topic-panel";
import type { ExamShare } from "@/components/exam-share-panel";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

// Kullanicinin "sinif/sinav x ders" matrisini terk etme talebiyle Genel
// Bakis artik tek bir konu seciminden ibaret (bkz. question-topic-panel.tsx:
// sinif/sinav satiri -> ders -> konu -> o konunun sorulari+ekle+onayla+
// paylas ayni yerde). Soru Havuzu ve Mufredat Yonetimi ise kullanicinin
// acik talebiyle (<details> degil) ayri SEKMELER olarak duruyor.
export default async function SorularPage() {
  const supabase = await createClient();

  const [
    { data: subjects },
    { data: courses },
    { data: rawTopics },
    { data: referenceQuestions },
    { data: referenceFiles },
    { data: countRows },
    { data: rawShares },
  ] = await Promise.all([
    supabase.from("subjects").select("id, name").order("name"),
    supabase.from("courses").select("id, name").order("name"),
    supabase
      .from("topics")
      .select("id, name, kazanim, grade_level, exam_types, subject_id, target_question_count, subjects(name)")
      .order("grade_level"),
    supabase
      .from("questions")
      .select("id, body, options, correct_option, explanation, difficulty, topic_id")
      .eq("is_reference_only", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("reference_pool_files")
      .select("id, file_name, storage_path, mime_type, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("questions").select("topic_id").eq("is_reference_only", false),
    supabase
      .from("exam_shares")
      .select("id, exam_type, token")
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const counts = new Map<string, number>();
  (countRows ?? []).forEach((q) => {
    if (!q.topic_id) return;
    counts.set(q.topic_id, (counts.get(q.topic_id) ?? 0) + 1);
  });

  const shares = new Map<string, ExamShare[]>();
  (rawShares ?? []).forEach((s) => {
    const list = shares.get(s.exam_type) ?? [];
    list.push(s);
    shares.set(s.exam_type, list);
  });

  const curriculumTopics: CurriculumTopicRow[] = (rawTopics ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    kazanim: t.kazanim,
    grade_level: t.grade_level,
    exam_types: t.exam_types,
    subjectName: firstOf(t.subjects)?.name ?? "Diğer",
  }));

  const panelTopics: PanelTopic[] = (rawTopics ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    grade_level: t.grade_level,
    subject_id: t.subject_id,
    subject_name: firstOf(t.subjects)?.name ?? "Diğer",
    exam_types: t.exam_types,
    target_question_count: t.target_question_count,
  }));

  const referencePoolQuestions = (referenceQuestions ?? []).map((q) => ({
    id: q.id,
    body: q.body,
    options: (q.options ?? {}) as Record<string, string>,
    correct_option: q.correct_option,
    explanation: q.explanation,
    difficulty: q.difficulty,
    topic_id: q.topic_id,
  }));

  const referencePoolTopics = panelTopics.map((t) => ({
    id: t.id,
    name: t.name,
    grade_level: t.grade_level,
    subject_id: t.subject_id,
    subject_name: t.subject_name,
    exam_types: t.exam_types,
  }));

  const referencePoolFiles = (referenceFiles ?? []).map((f) => ({
    id: f.id,
    file_name: f.file_name,
    storage_path: f.storage_path,
    mime_type: f.mime_type,
    created_at: f.created_at,
  }));

  const genelBakisTab = <QuestionTopicPanel topics={panelTopics} counts={counts} shares={shares} isAdmin />;

  const soruHavuzuTab = (
    <div className="flex flex-col gap-6">
      <ReferencePoolAddPanel />
      <div className="border-t border-slate-200 pt-6">
        <ReferencePoolBrowser topics={referencePoolTopics} questions={referencePoolQuestions} />
      </div>
      <div className="border-t border-slate-200 pt-6">
        <p className="mb-3 text-sm font-semibold text-slate-700">Soru Havuzu Dosyaları</p>
        <p className="mb-3 text-xs text-slate-500">
          Havuza yüklediğin PDF/Word/metin dosyaları — kaynak olarak burada saklanır.
        </p>
        <ReferencePoolFiles files={referencePoolFiles} />
      </div>
    </div>
  );

  const mufredatTab = (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SubjectAddForm />
        <CourseManager courses={courses ?? []} />
      </div>
      <TopicAddForm subjects={subjects ?? []} courses={courses ?? []} />
      <CurriculumBrowser topics={curriculumTopics} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sorular</h1>
        <p className="text-sm text-slate-500">
          Bir konu seç; o konunun soruları, ekleme, onaylama ve paylaşım seçenekleriyle birlikte aşağıda açılır.
        </p>
      </div>

      <SimpleTabs
        defaultKey="genel"
        syncQueryParam="tab"
        tabs={[
          { key: "genel", label: "Genel Bakış", content: genelBakisTab, tone: "indigo" },
          { key: "havuz", label: "Soru Havuzu", content: soruHavuzuTab },
          { key: "mufredat", label: "Müfredat", content: mufredatTab },
        ]}
      />
    </div>
  );
}
