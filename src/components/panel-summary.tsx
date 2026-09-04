import { Badge, DashboardActionCard } from "@/components/ui";
import { RecentQuestionsCard } from "@/components/recent-questions-card";
import type { RecentQuestionActivity } from "@/lib/questions/recent";

// Eskiden hem admin'in Genel Bakis'i hem de ogretmenin Genel Bakis'i kendi
// icinde ayri ayri "Soru Ekle"/"Soru Onayla" kartlarini + Son Eklenen/
// Onaylanan Sorular listesini olusturuyordu. Kullanicinin "ogretmen panelinde
// de ilk acilis admin paneli gibi olsun, bu gorunen kisim ikisinde de 2.
// sekme olsun" talebiyle artik iki yerde de AYNI ozet - bu ortak bilesen
// kullaniliyor (admin: isAdmin + subjectIds=null/branchNames yok, ogretmen:
// isAdmin=false + kendi branslari).
export function PanelSummary({
  isAdmin,
  branchNames,
  addHref,
  approveHref,
  addSubtitle,
  approveSubtitle,
  pendingCount,
  recentActivity,
  currentUserId,
}: {
  isAdmin: boolean;
  branchNames?: string[];
  addHref: string;
  approveHref: string;
  addSubtitle: string;
  approveSubtitle: string;
  pendingCount: number;
  recentActivity: RecentQuestionActivity;
  currentUserId?: string | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      {branchNames && branchNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Branşların:</span>
          {branchNames.map((name) => (
            <Badge key={name}>{name}</Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DashboardActionCard href={addHref} emoji="➕" title="Soru Ekle" subtitle={addSubtitle} tone="indigo" />
        <DashboardActionCard
          href={approveHref}
          emoji="✅"
          title="Soru Onayla"
          subtitle={approveSubtitle}
          tone="amber"
          badge={pendingCount}
        />
      </div>

      <RecentQuestionsCard
        added={recentActivity.added}
        approved={recentActivity.approved}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
      />
    </div>
  );
}
