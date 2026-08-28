import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { TutorReferralActions } from "@/components/tutor-referral-actions";

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

export default async function OzelDersPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: referrals, error } = await supabase
    .from("tutor_referrals")
    .select(
      "id, status, requested_at, tutor_id, topics(name), profiles!tutor_referrals_student_id_fkey(full_name), tutor_sessions(id, scheduled_at, duration_minutes, teacher_notes, status)"
    )
    .order("requested_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Özel Ders Talepleri</h1>
        <p className="text-sm text-slate-500">
          Öğrencilerin özel ders ihtiyacı belirlenen konularını üstlenip ders saatini planlayabilirsin.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">Hata: {error.message}</p>}
      {!error && !referrals?.length && (
        <Card>
          <p className="text-sm text-slate-500">Şu anda özel ders talebi yok.</p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {referrals?.map((r) => {
          const student = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          const topic = Array.isArray(r.topics) ? r.topics[0] : r.topics;
          return (
            <Card key={r.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{student?.full_name ?? "Öğrenci"}</p>
                  <p className="text-sm text-slate-500">{topic?.name ?? "Genel"}</p>
                </div>
                <Badge tone={STATUS_TONE[r.status] ?? "default"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
              </div>
              <TutorReferralActions
                referralId={r.id}
                status={r.status}
                tutorId={r.tutor_id}
                currentUserId={userData.user?.id}
                sessions={r.tutor_sessions ?? []}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
