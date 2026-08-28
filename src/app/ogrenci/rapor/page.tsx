import { Card, StatCard, Badge } from "@/components/ui";
import { ReportHeader } from "@/components/report-header";
import { ParentTutorRequestForm } from "@/components/parent-tutor-request-form";
import { ParentGoalAssignForm } from "@/components/parent-goal-assign-form";
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

      {/* Genel durum: acilista once bu goruntulenir. */}
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

      {/* Genel raporlama: ozel ders, calisma programi, konu izleme, eksikler. */}
      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Özel Ders Durumu</h2>
        {!data.referrals.length && <p className="text-sm text-slate-500">Şu ana kadar özel ders ihtiyacı çıkmadı.</p>}
        <ul className="flex flex-col gap-2">
          {data.referrals.map((r) => {
            const topic = firstOf(r.topics);
            const session = (r.tutor_sessions ?? [])[0];
            return (
              <li key={r.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>{topic?.name ?? "Genel"}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{new Date(r.requested_at).toLocaleDateString("tr-TR")}</span>
                    <Badge tone={r.status === "pending" ? "amber" : r.status === "completed" ? "green" : "default"}>
                      {REFERRAL_LABEL[r.status] ?? r.status}
                    </Badge>
                  </div>
                </div>
                {session?.scheduled_at && (
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                    <span>
                      {new Date(session.scheduled_at).toLocaleString("tr-TR")} · {session.duration_minutes} dk
                    </span>
                    {session.meeting_link && (
                      <a href={session.meeting_link} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 underline">
                        Canlı ders linki
                      </a>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {data.role === "parent" && <ParentTutorRequestForm studentId={data.studentId} />}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Çalışma Programı / Hedefler</h2>
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
        {data.role === "parent" && <ParentGoalAssignForm studentId={data.studentId} />}
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

      {/* Gunluk aktivite: en altta, gun gun. */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Günlük Aktivite</h2>
        {!data.dailyGroups.length && (
          <Card>
            <p className="text-sm text-slate-500">Henüz kaydedilmiş bir aktivite yok.</p>
          </Card>
        )}
        <div className="flex flex-col gap-4">
          {data.dailyGroups.map((group) => (
            <Card key={group.dateKey}>
              <h3 className="mb-3 font-semibold capitalize text-slate-900">{group.dateLabel}</h3>
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
      </div>
    </div>
  );
}
