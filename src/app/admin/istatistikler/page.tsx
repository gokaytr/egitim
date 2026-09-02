import { loadSiteAnalytics } from "@/lib/reports/site-analytics";
import { createClient } from "@/lib/supabase/server";
import { StatCard, Card, Badge } from "@/components/ui";
import { DailyPageViewsChart, RankedBarList } from "@/components/analytics-charts";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "az önce";
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} sa önce`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} gün önce`;
}

export default async function IstatistiklerPage() {
  const supabase = await createClient();
  const [data, { count: studentCount }, { count: teacherCount }, { count: questionCount }, { count: pendingCount }] =
    await Promise.all([
      loadSiteAnalytics(),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
      supabase.from("questions").select("*", { count: "exact", head: true }),
      supabase.from("questions").select("*", { count: "exact", head: true }).eq("is_approved", false),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">İstatistikler</h1>
        <p className="text-sm text-slate-500">Platform özeti, ziyaret ve sayfa görüntüleme verileri</p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-slate-900">Platform Özeti</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Öğrenci" value={studentCount ?? 0} />
          <StatCard label="Öğretmen" value={teacherCount ?? 0} />
          <StatCard label="Toplam Soru" value={questionCount ?? 0} />
          <StatCard label="Onay Bekleyen Soru" value={pendingCount ?? 0} hint="AI üretimi dahil" />
        </div>
      </div>

      <h2 className="-mb-2 font-semibold text-slate-900">Ziyaret İstatistikleri (Son 30 Gün)</h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Sayfa Görüntüleme" value={data.totalPageViews} />
        <StatCard label="Tekil Ziyaretçi" value={data.uniqueVisitors} />
        <StatCard label="Yeni Ziyaretçi" value={data.newVisitors} />
        <StatCard label="Geri Dönen" value={data.returningVisitors} />
        <StatCard label="Giriş Yapmış Kullanıcı" value={data.loggedInUsers} />
      </div>

      <DailyPageViewsChart dailyCounts={data.dailyCounts} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankedBarList
          title="En Çok Görüntülenen Sayfalar"
          rows={data.topPages.map((p) => ({ label: p.path, count: p.count }))}
          emptyLabel="Henüz kayıtlı görüntüleme yok."
        />
        <RankedBarList
          title="Ülkeler"
          rows={data.countries.map((c) => ({ label: c.country, count: c.count }))}
          emptyLabel="Henüz kayıtlı görüntüleme yok."
        />
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Kullanıcı Aktivitesi</h2>
        {data.userActivity.length === 0 ? (
          <p className="text-sm text-slate-500">Giriş yapmış kullanıcı aktivitesi yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-4">E-posta</th>
                  <th className="pb-2 pr-4">Durum</th>
                  <th className="pb-2 pr-4">Görüntüleme</th>
                  <th className="pb-2 pr-4">Sayfa</th>
                  <th className="pb-2">Son Görülme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.userActivity.map((u) => (
                  <tr key={u.email}>
                    <td className="py-2 pr-4 text-slate-700">{u.email}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={u.isNew ? "green" : "default"}>{u.isNew ? "Yeni" : "Geri Dönen"}</Badge>
                    </td>
                    <td className="py-2 pr-4 font-medium text-slate-900">{u.views}</td>
                    <td className="py-2 pr-4 text-slate-500">{u.pages}</td>
                    <td className="py-2 text-slate-400">{timeAgo(u.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
