import { Card, StatCard } from "@/components/ui";
import { ReportHeader } from "@/components/report-header";
import { loadReportData } from "@/lib/reports/report-data";

export default async function RaporGenelBakisPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const { studentId } = await searchParams;
  const data = await loadReportData(studentId);

  if ("needsSetup" in data) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{data.pageTitle}</h1>
        </div>
        {data.role === "parent" ? (
          <Card>
            <h2 className="mb-2 font-semibold text-slate-900">Henüz bağlı bir öğrenci yok</h2>
            <p className="mb-4 text-sm text-slate-500">Çocuğunun e-posta adresini gir, hesabına bağlansın.</p>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-slate-500">Henüz öğrenci kaydı yok.</p>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ReportHeader data={data} />

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Genel Durum Raporu</h2>
        <div className="flex flex-col gap-2">
          {data.overviewParagraphs.map((p, i) => (
            <p key={i} className="text-sm text-slate-600">
              {p}
            </p>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-slate-900">Son Aktivite</h2>
        {data.lastActivity ? (
          <p className="text-sm text-slate-600">
            <span className="mr-2 text-xs text-slate-400">
              {new Date(data.lastActivity.occurredAt).toLocaleString("tr-TR")}
            </span>
            {data.lastActivity.description}
          </p>
        ) : (
          <p className="text-sm text-slate-500">Henüz herhangi bir aktivite yok.</p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Çözülen Soru"
          value={data.totalSolved}
          hint={`${data.totalCorrect} doğru · ${data.totalWrong} yanlış · ${data.totalEmpty} boş`}
        />
        <StatCard label="Başarı Oranı" value={data.accuracy !== null ? `%${data.accuracy}` : "-"} />
        <StatCard label="İzlenen Konu Anlatımı" value={data.distinctContentViewed} />
        <StatCard label="Hedeflenen Kalan Soru" value={data.targetQuestionsRemaining} />
      </div>
    </div>
  );
}
