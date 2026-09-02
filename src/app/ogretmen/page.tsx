import { Card, Badge, DashboardActionCard } from "@/components/ui";
import { resolveEffectiveTeacher } from "@/lib/teacher/effective-teacher";
import { createClient } from "@/lib/supabase/server";

export default async function OgretmenDashboard({ searchParams }: { searchParams: Promise<{ teacherId?: string }> }) {
  const { teacherId: requestedTeacherId } = await searchParams;
  const { teacherId } = await resolveEffectiveTeacher(requestedTeacherId);
  const supabase = await createClient();

  const [{ data: referrals }, { data: mySubjects }, { data: subjectRows }] = await Promise.all([
    supabase
      .from("tutor_referrals")
      .select("id, status, topics(name), profiles!tutor_referrals_student_id_fkey(full_name)")
      .in("status", ["pending", "matched"])
      .limit(5),
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

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Özel Ders Talepleri</h2>
        {!referrals?.length && <p className="text-sm text-slate-500">Şu anda bekleyen talep yok.</p>}
        <ul className="divide-y divide-slate-100">
          {referrals?.map((r) => {
            const student = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            const topic = Array.isArray(r.topics) ? r.topics[0] : r.topics;
            return (
              <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                <span>{student?.full_name} — {topic?.name}</span>
                <Badge tone={r.status === "pending" ? "amber" : "green"}>{r.status}</Badge>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}