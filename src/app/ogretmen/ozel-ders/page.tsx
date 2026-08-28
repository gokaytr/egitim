import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { TutorReferralActions } from "@/components/tutor-referral-actions";
import { resolveEffectiveTeacher } from "@/lib/teacher/effective-teacher";

const STATUS_LABEL: Record<string, string> = {
  pending: "Bekliyor",
  matched: "Öğretmen atandı",
  scheduled: "Planlandı",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

const STATUS_TONE: Record<string, "default" | "green" | "amber" | "red"> = {
  pending: "amber",
  matched: "default",
  scheduled: "default",
  completed: "green",
  cancelled: "red",
};

export default async function OzelDersPage({ searchParams }: { searchParams: Promise<{ teacherId?: string }> }) {
  const { teacherId: requestedTeacherId } = await searchParams;
  const { teacherId } = await resolveEffectiveTeacher(requestedTeacherId);
  const supabase = await createClient();

  const [{ data: referrals, error }, { data: myAssignments }] = await Promise.all([
    supabase
      .from("tutor_referrals")
      .select(
        "id, status, requested_at, tutor_id, topics(name, subject_id), profiles!tutor_referrals_student_id_fkey(full_name), tutor_sessions(id, scheduled_at, duration_minutes, teacher_notes, meeting_link, status)"
      )
      .order("requested_at", { ascending: false }),
    supabase.from("teacher_subjects").select("subject_id").eq("teacher_id", teacherId),
  ]);

  const myBranchIds = new Set((myAssignments ?? []).map((a) => a.subject_id));

  function isMyBranch(topic: { subject_id?: string } | undefined) {
    return !!topic?.subject_id && myBranchIds.has(topic.subject_id);
  }

  const sortedReferrals = [...(referrals ?? [])].sort((a, b) => {
    const aTopic = Array.isArray(a.topics) ? a.topics[0] : a.topics;
    const bTopic = Array.isArray(b.topics) ? b.topics[0] : b.topics;
    const aMine = isMyBranch(aTopic) ? 1 : 0;
    const bMine = isMyBranch(bTopic) ? 1 : 0;
    if (aMine !== bMine) return bMine - aMine;
    return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
  });

  const myUpcomingSessions = (referrals ?? [])
    .filter((r) => r.tutor_id === teacherId)
    .flatMap((r) => {
      const student = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      const topic = Array.isArray(r.topics) ? r.topics[0] : r.topics;
      return (r.tutor_sessions ?? []).map((s) => ({ ...s, studentName: student?.full_name, topicName: topic?.name }));
    })
    .filter((s) => s.scheduled_at && s.status !== "completed" && new Date(s.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Özel Ders Talepleri</h1>
        <p className="text-sm text-slate-500">
          Öğrencilerin özel ders ihtiyacı belirlenen konularını üstlenip ders saatini planlayabilirsin.
        </p>
      </div>

      {myUpcomingSessions.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold text-slate-900">Programım — Yaklaşan Dersler</h2>
          <ul className="flex flex-col gap-2">
            {myUpcomingSessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>
                  {s.studentName ?? "Öğrenci"} · {s.topicName ?? "Genel"}
                </span>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{new Date(s.scheduled_at!).toLocaleString("tr-TR")} · {s.duration_minutes} dk</span>
                  {s.meeting_link && (
                    <a href={s.meeting_link} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 underline">
                      Canlı ders linki
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {error && <p className="text-sm text-red-600">Hata: {error.message}</p>}
      {!error && !referrals?.length && (
        <Card>
          <p className="text-sm text-slate-500">Şu anda özel ders talebi yok.</p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {sortedReferrals.map((r) => {
          const student = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          const topic = Array.isArray(r.topics) ? r.topics[0] : r.topics;
          return (
            <Card key={r.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{student?.full_name ?? "Öğrenci"}</p>
                  <p className="text-sm text-slate-500">{topic?.name ?? "Genel"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isMyBranch(topic) && <Badge tone="green">Branşın</Badge>}
                  <Badge tone={STATUS_TONE[r.status] ?? "default"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                </div>
              </div>
              <TutorReferralActions
                referralId={r.id}
                status={r.status}
                tutorId={r.tutor_id}
                currentUserId={teacherId}
                sessions={r.tutor_sessions ?? []}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
