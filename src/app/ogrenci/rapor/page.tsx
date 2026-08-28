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

  const upcomingSession = data.referrals
    .flatMap((r) => (r.tutor_sessions ?? []).map((s) => ({ ...s, topicName: (Array.isArray(r.topics) ? r.topics[0] : r.topics)?.name })))
    .filter((s) => s.scheduled_at && s.status !== "completed" && new Date(s.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];

  return (
    <div className="flex flex-col gap-6">
      <ReportHeader data={data} />

      {upcomingSession && (
        <Card className="border-indigo-200 bg-indigo-50">
          <h2 className="mb-1 font-semibold text-indigo-900">Yaklaşan Özel Ders</h2>
          <p className="text-sm text-indigo-800">
            {upcomingSession.topicName ?? "Genel"} · {new Date(upcomingSession.scheduled_at!).toLocaleString("tr-TR")} ·{" "}
            {upcomingSession.duration_minutes} dk
          </p>
          {upcomingSession.meeting_link && (
            <a
              href={upcomingSession.meeting_link}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm font-medium text-indigo-700 underline"
            >
              Canlı ders linkine git
            </a>
          )}
        </Card>
      )}

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
