import { Badge, DashboardActionCard } from "@/components/ui";
import { RecentQuestionsCard } from "@/components/recent-questions-card";
import { getRecentQuestions } from "@/lib/questions/recent";
import { resolveEffectiveTeacher } from "@/lib/teacher/effective-teacher";
import { createClient } from "@/lib/supabase/server";

export default async function OgretmenDashboard({ searchParams }: { searchParams: Promise<{ teacherId?: string }> }) {
  const { teacherId: requestedTeacherId } = await searchParams;
  const { teacherId } = await resolveEffectiveTeacher(requestedTeacherId);
  const supabase = await createClient();

  const [{ data: mySubjects }, { data: subjectRows }] = await Promise.all([
    supabase.from("teacher_subjects").select("subjects(name)").eq("teacher_id", teacherId),
    supabase.from("teacher_subjects").select("subject_id").eq("teacher_id", teacherId ?? ""),
  ]);

  const subjectIds = (subjectRows ?? []).map((r) => r.subject_id);
  let pendingQuestionCount = 0;
  if (subjectIds.length > 0) {
    const { count } = await supabase
      .from("questions")
      .select("id, topics!inner(subject_id)", { count: "exact", head: true })
      .eq("is_approved", false)
      .in("topics.subject_id", subjectIds);
    pendingQuestionCount = count ?? 0;
  }

  const recentQuestions = await getRecentQuestions(supabase, subjectIds.length > 0 ? subjectIds : ["__none__"]);

  type SubjectRow = { subjects: { name: string } | { name: string }[] | null };
  const branchNames = ((mySubjects ?? []) as SubjectRow[])
    .map((row) => (Array.isArray(row.subjects) ? row.subjects[0]?.name : row.subjects?.name))
    .filter((n): n is string => !!n);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Genel Bakış</h1>
        <p className="text-sm text-slate-500">
          Sitenin en önemli konusu soru — önce soru ekleme ve onaylama akışı.
        </p>
      </div>

      {branchNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Branşların:</span>
          {branchNames.map((name) => (
            <Badge key={name}>{name}</Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DashboardActionCard
          href="/ogretmen/sorular?tab=ekle"
          emoji="➕"
          title="Soru Ekle"
          subtitle="Elle, kopyala-yapıştır veya yapay zeka ile yeni soru ekle."
          tone="indigo"
        />
        <DashboardActionCard
          href="/ogretmen/sorular?tab=onay"
          emoji="✅"
          title="Soru Onayla"
          subtitle="Branşındaki onay bekleyen soruları incele ve kalite kontrolünden geçir."
          tone="amber"
          badge={pendingQuestionCount}
        />
      </div>

      <RecentQuestionsCard questions={recentQuestions} isAdmin={false} currentUserId={teacherId} />
    </div>
  );
}