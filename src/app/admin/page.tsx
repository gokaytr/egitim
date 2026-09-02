import { createClient } from "@/lib/supabase/server";
import { RecentQuestionsCard } from "@/components/recent-questions-card";
import { getRecentQuestionActivity } from "@/lib/questions/recent";
import { PlanningBoard, type PlanningTopic, type ExamShare } from "@/components/planning-board";
import type { QuestionDifficulty } from "@/lib/questions/difficulty";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

// Admin panelinin ILK giris ekrani burasi: "sinav sinav / sinif sinif soru
// ekleme planlamasi ve takvimi" talebi uzerine kuruldu. Eskiden burada ayrica
// "Soru Ekle / Soru Onayla / Soru Havuzu" yonlendirme kartlari da vardi -
// kullanicinin acik talebiyle ("anasayfada soru ekle onayla planla kismi
// gorunmesin") kaldirildi; bu uc islev artik sadece sol menudeki "Sorular"
// sekmesinden erisiliyor. Son eklenen/onaylanan sorular akisi ise
// kullanicinin ayrica belirttigi gibi ("degistirme") oldugu gibi kaliyor.
export default async function AdminDashboard() {
  const supabase = await createClient();

  const [recentActivity, { data: rawTopics }, { data: rawQuestions }, { data: rawShares }] = await Promise.all([
    getRecentQuestionActivity(supabase, null),
    supabase
      .from("topics")
      .select("id, name, grade_level, subject_id, exam_types, target_question_count, subjects(name)")
      .order("grade_level"),
    supabase
      .from("questions")
      .select("topic_id, difficulty")
      .eq("is_reference_only", false),
    supabase
      .from("exam_shares")
      .select("id, exam_type, token, label, created_at")
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const shares = new Map<string, ExamShare[]>();
  (rawShares ?? []).forEach((s) => {
    const list = shares.get(s.exam_type) ?? [];
    list.push(s);
    shares.set(s.exam_type, list);
  });

  const planningTopics: PlanningTopic[] = (rawTopics ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    grade_level: t.grade_level,
    subject_id: t.subject_id,
    subject_name: firstOf(t.subjects)?.name ?? "Diğer",
    exam_types: t.exam_types,
    target_question_count: t.target_question_count,
  }));

  const questionCounts = new Map<string, Partial<Record<QuestionDifficulty, number>>>();
  (rawQuestions ?? []).forEach((q) => {
    if (!q.topic_id) return;
    const byDiff = questionCounts.get(q.topic_id) ?? {};
    const d = q.difficulty as QuestionDifficulty;
    byDiff[d] = (byDiff[d] ?? 0) + 1;
    questionCounts.set(q.topic_id, byDiff);
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Planlama</h1>
        <p className="text-sm text-slate-500">
          Sınav → sınıf/ders → konu bazında hedef soru sayısı ve ilerleme. Her gün 1-2 ders bitirsen bile, en geride
          kalan konular başta gösterilir — dengeli ilerlemek için oradan devam et.
        </p>
      </div>

      <PlanningBoard topics={planningTopics} questionCounts={questionCounts} shares={shares} />

      <RecentQuestionsCard added={recentActivity.added} approved={recentActivity.approved} isAdmin />
    </div>
  );
}
