import { Card } from "@/components/ui";
import { ReportHeader } from "@/components/report-header";
import { StudentReportView } from "@/components/student-report-view";
import { loadReportData, firstOf } from "@/lib/reports/report-data";

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

  const latestDiagnosis = data.diagnoses[0];

  return (
    <div className="flex flex-col gap-6">
      <ReportHeader data={data} />

      {data.role === "parent" && latestDiagnosis && !latestDiagnosis.acknowledged_at && (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">Uyarı:</span> {data.studentProfile?.full_name?.split(" ")[0] ?? "Öğrenci"} son
            analizi ve tavsiyeleri henüz “Okudum, Anladım” diyerek onaylamadı.
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

      {/* Veli ekranindaki rapor govdesi, admin/ogretmen tarafinda kullanilan
          StudentReportView ile birebir ayni - grafikler, calisma programi,
          gecmis sinav sonuclari, izleme gecmisi, eksik analizleri ve ozel
          ders talepleri dahil tam rapor. */}
      <StudentReportView data={data} />
    </div>
  );
}
