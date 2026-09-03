import { createClient } from "@/lib/supabase/server";
import { QuestionBankBrowser } from "@/components/question-bank-browser";
import { resolveEffectiveTeacher } from "@/lib/teacher/effective-teacher";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

// Kullanicinin talebiyle ("soru ekle ve soru onayla mantigini tamamen sil...
// basitlestir ekrani") bu sayfa artik SimpleTabs/ayri sekmeler kullanmiyor:
// tek ekran = sinif/sinav x ders kapsama matrisi (bkz.
// question-bank-browser.tsx). Soru ekleme, hucreye tiklaninca acilan panelin
// icinde; soru onaylama da ayni panelde soru basina kucuk bir "Onayla"
// butonuyla yapiliyor - PendingQuestionsBrowser artik kullanilmiyor.
// Ogretmen "Soru Havuzu" satirini gormez (isAdmin=false).
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

  let topics: {
    id: string;
    name: string;
    grade_level: number | null;
    subject_id: string;
    subject_name: string;
    exam_types: string[] | null;
    target_question_count: number | null;
  }[] = [];
  const counts = new Map<string, number>();

  if (subjectIds.length > 0) {
    const [{ data: rawTopics }, { data: countRows }] = await Promise.all([
      supabase
        .from("topics")
        .select("id, name, grade_level, subject_id, exam_types, target_question_count, subjects(name)")
        .in("subject_id", subjectIds),
      // Genel Bakis matrisi icin - konu basina TOPLAM (onayli/bekleyen
      // farketmeksizin) normal soru sayisi. Onaylama artik matrisin
      // icindeki hucre panelinde tek tek yapiliyor.
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
          Sınıf/sınav — ders kapsama tablosu. Bir hücreye tıklayınca o kombinasyondaki sorular, onaylama ve soru
          ekleme seçenekleriyle birlikte açılır.
        </p>
      </div>

      {subjectIds.length === 0 ? (
        <p className="text-sm text-amber-700">
          Size henüz bir branş atanmamış. Admin panelinden bir branş atanması gerekiyor.
        </p>
      ) : (
        <QuestionBankBrowser topics={topics} counts={counts} isAdmin={false} />
      )}
    </div>
  );
}
