import { Card, StatCard } from "@/components/ui";
import { ReportHeader } from "@/components/report-header";
import { loadReportData, firstOf } from "@/lib/reports/report-data";
import { sortEventsDesc } from "@/lib/reports/activity-feed";

export default async function RaporPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
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
            {data.role === "parent" ? "Henüz bağlı bir öğrenci yok. Çocuğunun e-posta adresini gir, hesabına bağlansın." : "Henüz öğrenci kaydı yok."}
          </p>
        </Card>
      </div>
    );
  }

  const upcomingSession = data.referrals
    .flatMap((r) => (r.tutor_sessions ?? []).map((s) => ({ ...s, topicName: firstOf(r.topics)?.name })))
    .filter((s) => s.scheduled_at && s.status !== "completed" && new Date(s.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];

  const recentEvents = sortEventsDesc(data.events).slice(0, 10);
  const latestDiagnosis = data.diagnoses[0];

  return (
    <div className="flex flex-col gap-6">
      <ReportHeader data={data} />

      {data.role === "parent" && latestDiagnosis && !latestDiagnosis.acknowledged_at && (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">Uyarı:</span> {data.studentProfile?.full_name?.split(" ")[0] ?? "Öğrenci"} son
            analizi ve tavsiyeleri henüz "Okudum, Anladım" diyerek onaylamadı.
          </p>
        </Card>
      )}

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

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Son Aktiviteler</h2>
        {!recentEvents.length && <p className="text-sm text-slate-500">Henüz herhangi bir aktivite yok.</p>}
        <ul className="flex flex-col gap-2">
          {recentEvents.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-700">{e.description}</span>
              <span className="whitespace-nowrap text-xs text-slate-400">
                {new Date(e.occurredAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
