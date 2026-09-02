import { createClient } from "@/lib/supabase/server";
import { SimpleTabs } from "@/components/simple-tabs";
import { QuestionAddScreen } from "@/components/question-add-screen";
import { SubjectAddForm } from "@/components/subject-add-form";
import { CourseManager } from "@/components/course-manager";
import { TopicAddForm } from "@/components/topic-add-form";
import { CurriculumBrowser, type CurriculumTopicRow } from "@/components/curriculum-browser";
import { PendingQuestionsBrowser } from "@/components/pending-questions-browser";
import { ReferencePoolBrowser } from "@/components/reference-pool-browser";
import { ReferencePoolAddPanel } from "@/components/reference-pool-add-panel";
import { ReferencePoolFiles } from "@/components/reference-pool-files";
import { QuestionBankBrowser, type BankShare } from "@/components/question-bank-browser";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

// Eskiden "Soru Ekle", "Soru Onayı" ve "Sorular" (tum liste) admin menusunde
// ayri ayri sayfalardi - artik tek bir "Sorular" sayfasi altinda uc sekme
// olarak birlestirildi, boylece soru is akisinin tamami (ekle -> onayla ->
// havuz) tek yerden yonetiliyor. "Soru Havuzu" sekmesi SADECE admin
// panelinde var (ogretmen panelinde yok) ve normal soru akisindan tamamen
// bagimsiz: buraya eklenen sorular (orn. ÖSYM'nin gecmis sinav sorulari)
// hicbir zaman ogrenciye gosterilmez, sadece yapay zekanin ornek alip
// egitilmesi icin saklanir - bkz. CLAUDE.md.
export default async function SorularPage() {
  const supabase = await createClient();

  const [
    { data: subjects },
    { data: courses },
    { data: rawTopics },
    { data: pending },
    { data: referenceQuestions },
    { data: referenceFiles },
    { data: bankCountRows },
    { data: rawShares },
  ] = await Promise.all([
    supabase.from("subjects").select("id, name").order("name"),
    supabase.from("courses").select("id, name").order("name"),
    supabase
      .from("topics")
      .select("id, name, kazanim, grade_level, exam_types, subject_id, subjects(name)")
      .order("grade_level"),
    supabase
      .from("questions")
      .select("id, body, options, correct_option, explanation, source, difficulty, topic_id, follows_new_policy")
      .eq("is_approved", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("questions")
      .select("id, body, options, correct_option, explanation, difficulty, topic_id")
      .eq("is_reference_only", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("reference_pool_files")
      .select("id, file_name, storage_path, mime_type, created_at")
      .order("created_at", { ascending: false }),
    // Sorulara girer girmez gorulen "Genel Bakis" sekmesi icin - butun
    // sorulari degil, sadece konu basina onayli/bekleyen sayisini cekiyoruz
    // (tek tek sorular, o konuya tiklaninca client tarafinda ayrica cekilir
    // - bkz. question-bank-browser.tsx, on binlerce soruya olceklensin diye).
    supabase.from("questions").select("topic_id, is_approved, follows_new_policy").eq("is_reference_only", false),
    supabase
      .from("exam_shares")
      .select("id, exam_type, token")
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const bankCounts = new Map<string, { approved: number; pending: number; approvedNew: number; pendingNew: number }>();
  (bankCountRows ?? []).forEach((q) => {
    if (!q.topic_id) return;
    const entry = bankCounts.get(q.topic_id) ?? { approved: 0, pending: 0, approvedNew: 0, pendingNew: 0 };
    const isNew = q.follows_new_policy ?? false;
    if (q.is_approved) {
      entry.approved += 1;
      if (isNew) entry.approvedNew += 1;
    } else {
      entry.pending += 1;
      if (isNew) entry.pendingNew += 1;
    }
    bankCounts.set(q.topic_id, entry);
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
    follows_new_policy: q.follows_new_policy ?? false,
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

  const genelBakisTab = <QuestionBankBrowser topics={browserTopics} counts={bankCounts} shares={shares} canShare />;

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

  const referencePoolFiles = (referenceFiles ?? []).map((f) => ({
    id: f.id,
    file_name: f.file_name,
    storage_path: f.storage_path,
    mime_type: f.mime_type,
    created_at: f.created_at,
  }));

  const havuzEkleTab = (
    <div className="flex flex-col gap-6">
      <ReferencePoolAddPanel />
    </div>
  );

  const havuzBirikenTab = <ReferencePoolBrowser topics={browserTopics} questions={referencePoolQuestions} />;

  const havuzPdfTab = (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-500">
        Soru Havuzu&apos;na yüklediğin PDF/Word/metin dosyaları — kaynak olarak burada saklanır, istediğinde
        görüntüleyip silebilirsin.
      </p>
      <ReferencePoolFiles files={referencePoolFiles} />
    </div>
  );

  const soruHavuzuTab = (
    <div className="flex flex-col gap-6">
      <SimpleTabs
        defaultKey="havuz-ekle"
        tabs={[
          { key: "havuz-ekle", label: "Şu An Eklenenler", content: havuzEkleTab, tone: "indigo" },
          { key: "havuz-biriken", label: "Biriken Sorular", content: havuzBirikenTab, tone: "emerald" },
          { key: "havuz-pdf", label: "PDF'ler", content: havuzPdfTab },
        ]}
      />
      {/* Aciklama kutusu eskiden en ustteydi, kullanicinin "aşağıdaki kısmı
          kapat, sayfa en altında yaz" talebiyle sayfanin en altina, varsayilan
          olarak kapali (kucuk bir <details>) bir nota tasindi - boylece asil
          is akisi (dosya yukle/ayristir) ekrani actiginda hemen karsina cikan
          ilk sey oluyor. */}
      <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <summary className="cursor-pointer touch-manipulation font-medium text-slate-500">
          🔒 Soru Havuzu ne işe yarar?
        </summary>
        <div className="mt-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Bu havuzdaki sorular öğrenciye ASLA gösterilmez.</p>
          <p className="mt-1">
            Soru Havuzu, normal soru ekleme/onaylama akışından tamamen bağımsız, sadece yapay zekânın örnek alıp
            eğitilmesi için bir kaynak. Buraya örneğin ÖSYM&apos;nin geçmiş sınav sorularını cevaplarıyla birlikte
            ekleyebilirsin — sistem bunları öğrenir ama ürettiği sorular birebir aynısı olmaz, benzer nitelikte yeni
            sorular üretir. Bu sekme sadece admin panelinde var.
          </p>
        </div>
      </details>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sorular</h1>
        <p className="text-sm text-slate-500">Soru ekleme, onaylama ve yapay zeka için soru havuzu tek ekranda.</p>
      </div>

      <SimpleTabs
        defaultKey="genel"
        syncQueryParam="tab"
        tabs={[
          { key: "genel", label: "Genel Bakış", content: genelBakisTab, tone: "indigo" },
          { key: "ekle", label: "Soru Ekle", content: soruEkleTab },
          { key: "onay", label: "Soru Onayla", content: soruOnayTab, dot: pendingQuestions.length > 0, tone: "amber" },
          { key: "havuz", label: "Soru Havuzu", content: soruHavuzuTab },
        ]}
      />
    </div>
  );
}
