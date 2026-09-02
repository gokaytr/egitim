import { createClient } from "@/lib/supabase/server";
import { DashboardActionCard } from "@/components/ui";
import { RecentQuestionsCard } from "@/components/recent-questions-card";
import { getRecentQuestionActivity } from "@/lib/questions/recent";
import { PlanningBoard, type PlanningTopic } from "@/components/planning-board";
import type { QuestionDifficulty } from "@/lib/questions/difficulty";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

// Admin panelinin artik ILK giris ekrani burasi: "sinav sinav / sinif sinif
// soru ekleme planlamasi ve takvimi" talebi uzerine, eskiden sadece 3 buyuk
// yonlendirme kartindan (Soru Ekle/Onayla/Havuzu) ibaret olan bu sayfaya
// PlanningBoard eklendi. Kartlar ve son aktivite akisi hala altta duruyor -
// planlamadan sonra dogrudan soru eklemeye gecebilmek icin.
export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ count: pendingCount }, recentActivity, { data: rawTopics }, { data: rawQuestions }] = await Promise.all([
    supabase.from("questions").select("*", { count: "exact", head: true }).eq("is_approved", false),
    getRecentQuestionActivity(supabase, null),
    supabase
      .from("topics")
      .select("id, name, grade_level, subject_id, exam_types, target_question_count, subjects(name)")
      .order("grade_level"),
    supabase
      .from("questions")
      .select("topic_id, difficulty")
      .eq("is_reference_only", false),
  ]);

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

      <PlanningBoard topics={planningTopics} questionCounts={questionCounts} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DashboardActionCard
          href="/admin/sorular?tab=ekle"
          emoji="➕"
          title="Soru Ekle"
          subtitle="Elle, kopyala-yapıştır veya yapay zeka ile yeni soru ekle."
          tone="indigo"
        />
        <DashboardActionCard
          href="/admin/sorular?tab=onay"
          emoji="✅"
          title="Soru Onayla"
          subtitle="Onay bekleyen soruları incele ve kalite kontrolünden geçir."
          tone="amber"
          badge={pendingCount ?? 0}
        />
        <DashboardActionCard
          href="/admin/sorular?tab=havuz"
          emoji="🔒"
          title="Soru Havuzu"
          subtitle="Yapay zekâyı eğitmek için referans sorular (ör. ÖSYM) ekle — öğrenciye hiç gösterilmez."
          tone="slate"
        />
      </div>

      <RecentQuestionsCard added={recentActivity.added} approved={recentActivity.approved} isAdmin />
    </div>
  );
}
