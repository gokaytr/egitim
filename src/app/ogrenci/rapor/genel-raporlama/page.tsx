import { Card, Badge } from "@/components/ui";
import { ReportHeader } from "@/components/report-header";
import { loadReportData, firstOf } from "@/lib/reports/report-data";

const WEAKNESS_TONE: Record<string, "green" | "amber" | "red"> = {
  none: "green",
  minor: "amber",
  major: "red",
};

const REFERRAL_LABEL: Record<string, string> = {
  pending: "Bekliyor",
  matched: "Öğretmen bulundu",
  scheduled: "Randevu planlandı",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

export default async function RaporGenelRaporlamaPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const { studentId } = await searchParams;
  const data = await loadReportData(studentId);

  if ("needsSetup" in data) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{data.pageTitle}</h1>
        </div>
        <Card>
          <p className="text-sm text-slate-500">
            {data.role === "parent" ? "Henüz bağlı bir öğrenci yok." : "Henüz öğrenci kaydı yok."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ReportHeader data={data} />

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Özel Ders Durumu</h2>
        {!data.referrals.length && <p className="text-sm text-slate-500">Şu ana kadar özel ders ihtiyacı çıkmadı.</p>}
        <ul className="flex flex-col gap-2">
          {data.referrals.map((r) => {
            const topic = firstOf(r.topics);
            return (
              <li key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>{topic?.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{new Date(r.requested_at).toLocaleDateString("tr-TR")}</span>
                  <Badge tone={r.status === "pending" ? "amber" : r.status === "completed" ? "green" : "default"}>
                    {REFERRAL_LABEL[r.status] ?? r.status}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Çalışma Programı</h2>
        {!data.planItems.length && <p className="text-sm text-slate-500">Henüz çalışma programına konu eklenmemiş.</p>}
        <ul className="flex flex-col gap-2">
          {data.planItems.map((p) => {
            const topic = firstOf(p.topics);
            return (
              <li key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>{topic?.name}</span>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{p.target_questions} soru · {p.target_minutes} dk</span>
                  <Badge tone={p.status === "done" ? "green" : p.status === "in_progress" ? "amber" : "default"}>
                    {p.status === "done" ? "Tamamlandı" : p.status === "in_progress" ? "Devam ediyor" : "Başlanmadı"}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Konu Anlatımı İzleme Geçmişi</h2>
        {!data.views.length && <p className="text-sm text-slate-500">Henüz konu anlatımı izlenmemiş.</p>}
        <ul className="flex flex-col gap-2">
          {data.views.map((v) => {
            const content = firstOf(v.lesson_contents);
            const topic = firstOf(content?.topics);
            return (
              <li key={v.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>{topic?.name} — {content?.title}</span>
                <span className="text-xs text-slate-400">{new Date(v.viewed_at).toLocaleDateString("tr-TR")}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Eksikler / Analiz Geçmişi</h2>
        {!data.diagnoses.length && <p className="text-sm text-slate-500">Henüz analiz yok, bir konu testi çözerek başlayabilirsin.</p>}
        <ul className="flex flex-col gap-3">
          {data.diagnoses.map((d) => {
            const topic = firstOf(d.topics);
            return (
              <li key={d.id} className="rounded-lg border border-slate-100 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium text-slate-900">{topic?.name}</span>
                  <Badge tone={WEAKNESS_TONE[d.weakness_level] ?? "default"}>{d.weakness_level}</Badge>
                  <span className="ml-auto text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString("tr-TR")}</span>
                </div>
                <p className="whitespace-pre-line text-sm text-slate-600">{d.ai_summary}</p>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
