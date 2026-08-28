import { StatCard, Card, Badge } from "@/components/ui";
import { TeacherSwitcher } from "@/components/teacher-switcher";
import { resolveEffectiveTeacher } from "@/lib/teacher/effective-teacher";
import { createClient } from "@/lib/supabase/server";

export default async function OgretmenDashboard({ searchParams }: { searchParams: Promise<{ teacherId?: string }> }) {
  const { teacherId: requestedTeacherId } = await searchParams;
  const { teacherId, isAdminPreview, candidates } = await resolveEffectiveTeacher(requestedTeacherId);
  const supabase = await createClient();

  const [{ count: myLessonCount }, { count: myQuestionCount }, { data: referrals }, { data: mySubjects }] = await Promise.all([
    supabase.from("lesson_contents").select("*", { count: "exact", head: true }).eq("teacher_id", teacherId),
    supabase.from("questions").select("*", { count: "exact", head: true }).eq("created_by", teacherId),
    supabase
      .from("tutor_referrals")
      .select("id, status, topics(name), profiles!tutor_referrals_student_id_fkey(full_name)")
      .in("status", ["pending", "matched"])
      .limit(5),
    supabase.from("teacher_subjects").select("subjects(name)").eq("teacher_id", teacherId),
  ]);

  type SubjectRow = { subjects: { name: string } | { name: string }[] | null };
  const branchNames = ((mySubjects ?? []) as SubjectRow[])
    .map((row) => (Array.isArray(row.subjects) ? row.subjects[0]?.name : row.subjects?.name))
    .filter((n): n is string => !!n);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Genel Bakış</h1>
        <p className="text-sm text-slate-500">Konu anlatımların ve sorularının özeti</p>
      </div>

      {isAdminPreview && <TeacherSwitcher candidates={candidates} currentId={teacherId} />}

      {branchNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Branşların:</span>
          {branchNames.map((name) => (
            <Badge key={name}>{name}</Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Eklediğim Konu Anlatımı" value={myLessonCount ?? 0} />
        <StatCard label="Eklediğim Soru" value={myQuestionCount ?? 0} />
        <StatCard label="Bekleyen Özel Ders Talebi" value={referrals?.length ?? 0} />
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
