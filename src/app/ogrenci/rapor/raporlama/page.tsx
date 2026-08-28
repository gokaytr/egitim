import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { ReportHeader } from "@/components/report-header";
import { ParentGoalAssignForm } from "@/components/parent-goal-assign-form";
import { ParentPlacementTestButton } from "@/components/parent-placement-test-button";
import { ParentAutoStudyPlanButton } from "@/components/parent-auto-study-plan-button";
import { loadReportData, firstOf } from "@/lib/reports/report-data";
import { StudentReportCharts } from "@/components/report-charts";

const WEAKNESS_TONE: Record<string, "green" | "amber" | "red"> = {
  none: "green",
  minor: "amber",
  major: "red",
};

const SOURCE_LABEL: Record<string, string> = {
  placement: "Seviye Tespiti",
  auto: "Otomatik Öneri",
};

const SOURCE_TONE: Record<string, "default" | "green" | "amber" | "red"> = {
  placement: "amber",
  auto: "default",
};

export default async function RaporlamaPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
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
        <h2 className="mb-3 font-semibold text-slate-900">Grafiklerle Rapor</h2>
        <StudentReportCharts data={data} />
      </Card>

      {data.role === "parent" && data.totalSolved === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <h2 className="mb-1 font-semibold text-slate-900">Seviye Tespit Sınavı</h2>
          <p className="mb-3 text-sm text-slate-600">
            {data.studentProfile?.full_name?.split(" ")[0] ?? "Öğrenci"} henüz hiç soru çözmedi. İstersen sınıf seviyesine
            uygun, farklı derslerden birkaç konuyu "seviye tespiti" olarak çalışma programına ekleyip performansını ve
            bilgi birikimini ölçebilirsin - sonuçlara göre çalışması ve çözmesi gereken konular otomatik önerilir.
          </p>
          <ParentPlacementTestButton studentId={data.studentId} gradeLevel={data.studentProfile?.grade_level ?? null} />
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Çalışma Programı / Hedefler</h2>
        <p className="mb-2 text-xs text-slate-500">
          Özel ders talebi ve randevuları artık ayrı "Özel Ders Talebi" sekmesinde.
        </p>
        {!data.planItems.length && <p className="text-sm text-slate-500">Henüz çalışma programına konu eklenmemiş.</p>}
        <ul className="flex flex-col gap-2">
          {data.planItems.map((p) => {
            const topic = firstOf(p.topics);
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>{topic?.name}</span>
                  {SOURCE_LABEL[p.source] && <Badge tone={SOURCE_TONE[p.source] ?? "default"}>{SOURCE_LABEL[p.source]}</Badge>}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{p.target_questions} soru · {p.target_minutes} dk</span>
                  <Badge tone={p.status === "done" ? "green" : p.status === "in_progress" ? "amber" : "default"}>
                    {p.status === "done" ? "Tamamlandı" : p.status === "in_progress" ? "Devam ediyor" : "Başlanmadı"}
                  </Badge>
                  {topic?.id && (
                    <Link href={`/ogrenci/konu/${topic.id}`} className="font-medium text-indigo-600 underline">
                      Soruları çöz →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {data.role === "parent" && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
            <ParentGoalAssignForm studentId={data.studentId} />
            <ParentAutoStudyPlanButton studentId={data.studentId} />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Geçmiş Sınav Sonuçları</h2>
        {!data.attempts.length && <p className="text-sm text-slate-500">Henüz çözülmüş bir test/deneme yok.</p>}
        <ul className="flex flex-col gap-2">
          {data.attempts.map((a) => {
            const topic = firstOf(a.topics);
            const answered = (a.correct_count ?? 0) + (a.wrong_count ?? 0);
            const score = answered > 0 ? Math.round(((a.correct_count ?? 0) / answered) * 100) : null;
            return (
              <li key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>{topic?.name ?? "Genel"}</span>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    {a.correct_count ?? 0} doğru · {a.wrong_count ?? 0} yanlış · {a.empty_count ?? 0} boş
                  </span>
                  {score !== null && (
                    <Badge tone={score >= 75 ? "green" : score >= 50 ? "amber" : "red"}>%{score}</Badge>
                  )}
                  <span className="text-slate-400">{new Date(a.started_at).toLocaleDateString("tr-TR")}</span>
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
                <p className="mt-2 text-xs font-medium">
                  {d.acknowledged_at ? (
                    <span className="text-green-700">
                      ✓ Öğrenci okudu — {new Date(d.acknowledged_at).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  ) : (
                    <span className="text-amber-700">Öğrenci henüz okumadı</span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
