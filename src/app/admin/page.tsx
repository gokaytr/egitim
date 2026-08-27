import { createClient } from "@/lib/supabase/server";
import { StatCard, Card } from "@/components/ui";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ count: studentCount }, { count: teacherCount }, { count: questionCount }, { count: pendingCount }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
      supabase.from("questions").select("*", { count: "exact", head: true }),
      supabase.from("questions").select("*", { count: "exact", head: true }).eq("is_approved", false),
    ]);

  const { data: pendingReferrals } = await supabase
    .from("tutor_referrals")
    .select("id, status, requested_at, profiles!tutor_referrals_student_id_fkey(full_name), topics(name)")
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Genel Bakış</h1>
        <p className="text-sm text-slate-500">Platformun anlık durumu</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Öğrenci" value={studentCount ?? 0} />
        <StatCard label="Öğretmen" value={teacherCount ?? 0} />
        <StatCard label="Toplam Soru" value={questionCount ?? 0} />
        <StatCard label="Onay Bekleyen Soru" value={pendingCount ?? 0} hint="AI üretimi dahil" />
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Bekleyen Özel Ders Talepleri</h2>
        {!pendingReferrals?.length && <p className="text-sm text-slate-500">Bekleyen talep yok.</p>}
        <ul className="divide-y divide-slate-100">
          {pendingReferrals?.map((r) => {
            const student = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            const topic = Array.isArray(r.topics) ? r.topics[0] : r.topics;
            return (
              <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                <span>{student?.full_name ?? "Öğrenci"} — {topic?.name ?? "Konu"}</span>
                <span className="text-slate-400">{new Date(r.requested_at).toLocaleDateString("tr-TR")}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
