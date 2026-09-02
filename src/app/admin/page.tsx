import { createClient } from "@/lib/supabase/server";
import { Card, DashboardActionCard } from "@/components/ui";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { count: pendingCount } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("is_approved", false);

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
        <p className="text-sm text-slate-500">
          Sitenin en önemli konusu soru — önce soru ekleme ve onaylama akışı.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
