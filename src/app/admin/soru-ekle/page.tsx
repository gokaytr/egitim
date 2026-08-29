import { createClient } from "@/lib/supabase/server";
import { QuestionAddScreen } from "@/components/question-add-screen";
import { SubjectAddForm } from "@/components/subject-add-form";
import { CourseManager } from "@/components/course-manager";
import { TopicAddForm } from "@/components/topic-add-form";
import { CurriculumBrowser, type CurriculumTopicRow } from "@/components/curriculum-browser";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export default async function AdminSoruEklePage() {
  const supabase = await createClient();

  const [{ data: subjects }, { data: courses }, { data: rawTopics }] = await Promise.all([
    supabase.from("subjects").select("id, name").order("name"),
    supabase.from("courses").select("id, name").order("name"),
    supabase.from("topics").select("id, name, kazanim, grade_level, exam_types, subjects(name)").order("grade_level"),
  ]);

  const topics: CurriculumTopicRow[] = (rawTopics ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    kazanim: t.kazanim,
    grade_level: t.grade_level,
    exam_types: t.exam_types,
    subjectName: firstOf(t.subjects)?.name ?? "Diğer",
  }));

  const curriculumTab = (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SubjectAddForm />
        <CourseManager courses={courses ?? []} />
      </div>
      <TopicAddForm subjects={subjects ?? []} courses={courses ?? []} />
      <CurriculumBrowser topics={topics} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Soru Ekle</h1>
        <p className="text-sm text-slate-500">
          Önce müfredat/konu ekleyin, sonra elle soru ekleyin veya kopyala-yapıştır ile ya da PDF/Word dosyası
          yükleyerek toplu soru içe aktarın. Bu ekran öğretmen panelindeki soru ekleme ekranıyla aynı işlevi görür.
        </p>
      </div>
      <QuestionAddScreen showAiTab curriculumTab={curriculumTab} />
    </div>
  );
}
