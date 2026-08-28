import { Card } from "@/components/ui";
import { ReportHeader } from "@/components/report-header";
import { loadReportData } from "@/lib/reports/report-data";

export default async function RaporGunlukAktivitePage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
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

      {!data.dailyGroups.length && (
        <Card>
          <p className="text-sm text-slate-500">Henüz kaydedilmiş bir aktivite yok.</p>
        </Card>
      )}
      {data.dailyGroups.map((group) => (
        <Card key={group.dateKey}>
          <h2 className="mb-3 font-semibold capitalize text-slate-900">{group.dateLabel}</h2>
          <ul className="flex flex-col gap-2">
            {group.events.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">{e.description}</span>
                <span className="whitespace-nowrap text-xs text-slate-400">
                  {new Date(e.occurredAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
