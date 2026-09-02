import { createClient } from "@/lib/supabase/server";
import { SimpleTabs } from "@/components/simple-tabs";
import { QuestionAddScreen } from "@/components/question-add-screen";
import { PendingQuestionsBrowser } from "@/components/pending-questions-browser";
import { QuestionBankBrowser } from "@/components/question-bank-browser";
import { resolveEffectiveTeacher } from "@/lib/teacher/effective-teacher";
import type { QuestionDifficulty } from "@/lib/questions/difficulty";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

// Soru Ekle ve Soru Onayi, ogretmen menusunde tek bir "Sorular" sayfasi
// altinda iki sekme olarak birlestirildi. "Soru Havuzu" (yapay zeka egitim
// referans havuzu) SADECE admin panelinde var - ogretmen bu havuza
// erisemez/ekleyemez, bkz. admin/sorular/page.tsx.
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
  }[] = [];
  let questions: {
    id: string;
    body: string;
    options: Record<string, string>;
    correct_option: string;
    explanation: string | null;
    source: string;
    difficulty: QuestionDifficulty | null;
    topic_id: string;
    follows_new_policy: boolean;
  }[] = [];
  const bankCounts = new Map<string, { approved: number; pending: number }>();

  if (subjectIds.length > 0) {
    const [{ data: rawTopics }, { data: pending }, { data: bankRows }] = await Promise.all([
      supabase
        .from("topics")
        .select("id, name, grade_level, subject_id, exam_types, subjects(name)")
        .in("subject_id", subjectIds),
      supabase
        .from("questions")
        .select(
          "id, body, options, correct_option, explanation, source, difficulty, topic_id, follows_new_policy, topics!inner(subject_id)"
        )
        .eq("is_approved", false)
        .in("topics.subject_id", subjectIds)
        .order("created_at", { ascending: false }),
      // Ogretmenin "Sorulara girince" gordugu Genel Bakis sekmesi icin -
      // sadece konu basina onayli/bekleyen sayisi (bkz. admin/sorular/page.tsx).
      supabase
        .from("questions")
        .select("topic_id, is_approved, topics!inner(subject_id)")
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
    }));

    questions = (pending ?? []).map((q) => ({
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

    (bankRows ?? []).forEach((q) => {
      if (!q.topic_id) return;
      const entry = bankCounts.get(q.topic_id) ?? { approved: 0, pending: 0 };
      if (q.is_approved) entry.approved += 1;
      else entry.pending += 1;
      bankCounts.set(q.topic_id, entry);
    });
  }

  const genelBakisTab =
    subjectIds.length === 0 ? (
      <p className="text-sm text-amber-700">
        Size henüz bir branş atanmamış. Admin panelinden bir branş atanması gerekiyor.
      </p>
    ) : (
      <QuestionBankBrowser topics={topics} counts={bankCounts} canShare={false} />
    );

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
        Yapay zekanın sizin branşınızda ürettiği sorular öğrencilere hemen yayınlanır; burada yaptığınız onay,
        sorunun görünürlüğünü değil kalite kontrolünü (öğretmen incelemesinden geçti mi) belirler. İncelenmemiş soru
        bulunan sınıf, ders ve konularda turuncu bir ışık yanar.
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sorular</h1>
        <p className="text-sm text-slate-500">Soru ekleme ve onaylama tek ekranda.</p>
      </div>

      <SimpleTabs
        defaultKey="genel"
        syncQueryParam="tab"
        tabs={[
          { key: "genel", label: "Genel Bakış", content: genelBakisTab, tone: "indigo" },
          { key: "ekle", label: "Soru Ekle", content: soruEkleTab },
          { key: "onay", label: "Soru Onayla", content: soruOnayTab, dot: questions.length > 0, tone: "amber" },
        ]}
      />
    </div>
  );
}
