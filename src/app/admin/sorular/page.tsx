import { createClient } from "@/lib/supabase/server";
import { SubjectAddForm } from "@/components/subject-add-form";
import { CourseManager } from "@/components/course-manager";
import { TopicAddForm } from "@/components/topic-add-form";
import { CurriculumBrowser, type CurriculumTopicRow } from "@/components/curriculum-browser";
import { ReferencePoolFiles } from "@/components/reference-pool-files";
import { QuestionBankBrowser, type BankShare } from "@/components/question-bank-browser";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

// Kullanicinin acik talebiyle ("soru ekle ve soru onayla mantigini
// tamamen sil, soru havuzu da dahil olmak uzere tamamen o excel goruntusu
// uzerinden ilerleyerek yapalim, basitlestir ekrani") bu sayfa artik tek
// bir sekmeli/karmasik yapi degil: tek ekran = sinif/sinav x ders kapsama
// matrisi (bkz. question-bank-browser.tsx). Soru ekleme, onaylama ve
// Soru Havuzu artik ayri sekmeler degil, matristeki bir hucreye tiklaninca
// acilan panelin icinde. Mufredat (ders/konu) yonetimi ve yuklenen PDF
// dosyalari listesi, gunluk is akisinin disinda kaldigi icin sayfanin en
// altinda varsayilan olarak kapali iki kucuk <details> olarak duruyor.
export default async function SorularPage() {
  const supabase = await createClient();

  const [
    { data: subjects },
    { data: courses },
    { data: rawTopics },
    { data: referenceFiles },
    { data: countRows },
    { data: havuzCountRows },
    { data: rawShares },
  ] = await Promise.all([
    supabase.from("subjects").select("id, name").order("name"),
    supabase.from("courses").select("id, name").order("name"),
    supabase
      .from("topics")
      .select("id, name, kazanim, grade_level, exam_types, subject_id, target_question_count, subjects(name)")
      .order("grade_level"),
    supabase
      .from("reference_pool_files")
      .select("id, file_name, storage_path, mime_type, created_at")
      .order("created_at", { ascending: false }),
    // Kapsama matrisinin ust kismi (sinif/sinav satirlari) icin - konu
    // basina TOPLAM (onayli/bekleyen farketmeksizin) normal soru sayisi.
    supabase.from("questions").select("topic_id").eq("is_reference_only", false),
    // Matrisin en alt "Soru Havuzu" satiri icin - konu basina referans
    // (is_reference_only=true) soru sayisi.
    supabase.from("questions").select("topic_id").eq("is_reference_only", true),
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

  const havuzCounts = new Map<string, number>();
  (havuzCountRows ?? []).forEach((q) => {
    if (!q.topic_id) return;
    havuzCounts.set(q.topic_id, (havuzCounts.get(q.topic_id) ?? 0) + 1);
  });

  const shares = new Map<string, BankShare[]>();
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

  const browserTopics = (rawTopics ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    grade_level: t.grade_level,
    subject_id: t.subject_id,
    subject_name: firstOf(t.subjects)?.name ?? "Diğer",
    exam_types: t.exam_types,
    target_question_count: t.target_question_count,
  }));

  const referencePoolFiles = (referenceFiles ?? []).map((f) => ({
    id: f.id,
    file_name: f.file_name,
    storage_path: f.storage_path,
    mime_type: f.mime_type,
    created_at: f.created_at,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sorular</h1>
        <p className="text-sm text-slate-500">
          Sınıf/sınav — ders kapsama tablosu. Bir hücreye tıklayınca o kombinasyondaki sorular, onaylama ve soru
          ekleme seçenekleriyle birlikte açılır.
        </p>
      </div>

      <QuestionBankBrowser topics={browserTopics} counts={counts} havuzCounts={havuzCounts} shares={shares} isAdmin />

      <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        <summary className="cursor-pointer touch-manipulation font-medium text-slate-500">Müfredat Yönetimi</summary>
        <div className="mt-3 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SubjectAddForm />
            <CourseManager courses={courses ?? []} />
          </div>
          <TopicAddForm subjects={subjects ?? []} courses={courses ?? []} />
          <CurriculumBrowser topics={curriculumTopics} />
        </div>
      </details>

      <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <summary className="cursor-pointer touch-manipulation font-medium text-slate-500">
          Soru Havuzu Dosyaları
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-slate-700">
            Soru Havuzu&apos;na (matrisin en altındaki satır) yüklediğin PDF/Word/metin dosyaları — kaynak olarak
            burada saklanır, istediğinde görüntüleyip silebilirsin. Bu havuzdaki sorular öğrenciye ASLA gösterilmez,
            sadece yapay zekânın örnek alıp eğitilmesi için saklanır.
          </p>
          <ReferencePoolFiles files={referencePoolFiles} />
        </div>
      </details>
    </div>
  );
}
