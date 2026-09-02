import { createClient } from "@/lib/supabase/server";
import { DashboardActionCard } from "@/components/ui";
import { RecentQuestionsCard } from "@/components/recent-questions-card";
import { getRecentQuestions } from "@/lib/questions/recent";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ count: pendingCount }, recentQuestions] = await Promise.all([
    supabase.from("questions").select("*", { count: "exact", head: true }).eq("is_approved", false),
    getRecentQuestions(supabase, null),
  ]);

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

      <RecentQuestionsCard questions={recentQuestions} isAdmin />
    </div>
  );
}
