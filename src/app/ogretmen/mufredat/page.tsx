import { createClient } from "@/lib/supabase/server";
import { TopicAddForm } from "@/components/topic-add-form";
import { CurriculumBrowser, type CurriculumTopicRow } from "@/components/curriculum-browser";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export default async function OgretmenMufredatPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const [{ data: subjects }, { data: courses }, { data: rawTopics }, { data: myAssignments }] = await Promise.all([
    supabase.from("subjects").select("id, name").order("name"),
    supabase.from("courses").select("id, name").order("name"),
    supabase.from("topics").select("id, name, grade_level, exam_types, subjects(name)").order("grade_level"),
    supabase.from("teacher_subjects").select("subject_id").eq("teacher_id", userData.user?.id),
  ]);

  // Ogretmene brans atanmissa, konu ekleme formundaki ders secimi kendi
  // branslariyla sinirlandirilir; hic atama yoksa herkes gorunmeye devam eder.
  const myBranchIds = new Set((myAssignments ?? []).map((a) => a.subject_id));
  const availableSubjects = myBranchIds.size > 0 ? (subjects ?? []).filter((s) => myBranchIds.has(s.id)) : subjects ?? [];

  const topics: CurriculumTopicRow[] = (rawTopics ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    grade_level: t.grade_level,
    exam_types: t.exam_types,
    subjectName: firstOf(t.subjects)?.name ?? "Diğer",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Müfredat / Konu Ekle</h1>
        <p className="text-sm text-slate-500">
          1. sınıftan 12. sınıfa mevcut konu ağacı. Ders ve kurs (LGS/TYT/AYT vb.) listesi admin panelinden
          yönetiliyor; buradan yeni konu ekleyebilirsin.
        </p>
      </div>

      <TopicAddForm subjects={availableSubjects} courses={courses ?? []} />

      <CurriculumBrowser topics={topics} />
    </div>
  );
}
