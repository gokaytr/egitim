import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { ReportHeader } from "@/components/report-header";
import { StudentReportView } from "@/components/student-report-view";
import { loadReportData, firstOf } from "@/lib/reports/report-data";

const WEAKNESS_TONE: Record<string, "green" | "amber" | "red"> = {
  none: "green",
  minor: "amber",
  major: "red",
};

const WEAKNESS_CARD_TONE: Record<string, string> = {
  none: "border-emerald-200 bg-emerald-50",
  minor: "border-amber-200 bg-amber-50",
  major: "border-red-200 bg-red-50",
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

  const latestDiagnosis = data.diagnoses[0];
  const studentFirstName = data.studentProfile?.full_name?.split(" ")[0] ?? "Öğrenci";
  const latestTopic = latestDiagnosis ? firstOf(latestDiagnosis.topics) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <ReportHeader data={data} />

      {/* Ogrencinin son test sonucunda gordugu degerlendirmenin (ai_summary)
          birebir aynisi burada da gosteriliyor - veli "ogrenciye ne
          soylendigini" gormek icin Raporlama sekmesine gitmek zorunda
          kalmasin. Tek kotu denemede hemen ozel ders onerilmez; bu ancak
          ayni konuda eksik tekrar tekrar cikinca (recommended_action ===
          "tutor_referral") bir secenek olarak veliye sunulur - otomatik
          talep olusturulmaz, veli isterse kendisi talep eder. */}
      {/* Sorumlu ogretmen karti - hem gercek veli hem de admin onizlemesinde
          (paritesi kurali) ayni sekilde gorunur. Bir ogrencinin ogretmeni
          olmayabilir (pakete gore opsiyonel), o zaman kart hic gosterilmez. */}
      {(data.role === "parent" || data.role === "admin") && data.responsibleTeacher && (
        <Card>
          <h2 className="mb-1 font-semibold text-slate-900">Sorumlu Öğretmen</h2>
          <p className="text-sm text-slate-700">
            {data.responsibleTeacher.full_name}
            {data.responsibleTeacher.subjects.length > 0 && (
              <span className="text-slate-500"> · {data.responsibleTeacher.subjects.join(", ")}</span>
            )}
          </p>
          {data.responsibleTeacher.email ? (
            <a
              href={`mailto:${data.responsibleTeacher.email}?subject=${encodeURIComponent(
                `${studentFirstName} hakkında`
              )}`}
              className="mt-2 inline-block text-sm font-medium text-indigo-600 underline"
            >
              ✉️ İletişime geç
            </a>
          ) : (
            <p className="mt-2 text-xs text-slate-400">Bu öğretmen için e-posta adresi kayıtlı değil.</p>
          )}
        </Card>
      )}

      {(data.role === "parent" || data.role === "admin") && latestDiagnosis && (
        <Card className={WEAKNESS_CARD_TONE[latestDiagnosis.weakness_level] ?? "border-slate-200 bg-slate-50"}>
          <div className="mb-1 flex items-center gap-2">
            <h2 className="font-semibold text-slate-900">Öğrenciye Söylenenler</h2>
            <Badge tone={WEAKNESS_TONE[latestDiagnosis.weakness_level] ?? "default"}>{latestDiagnosis.weakness_level}</Badge>
          </div>
          <p className="mb-2 text-xs text-slate-500">
            {latestTopic?.name ?? "Genel"} konusunda çözdüğü son testten sonra {studentFirstName}&apos;a gösterilen
            değerlendirme:
          </p>
          <p className="whitespace-pre-line text-sm text-slate-700">{latestDiagnosis.ai_summary}</p>
          <p className="mt-2 text-xs font-medium">
            {latestDiagnosis.acknowledged_at ? (
              <span className="text-green-700">✓ {studentFirstName} okudu</span>
            ) : (
              <span className="text-amber-700">{studentFirstName} henüz okumadı</span>
            )}
          </p>
          {latestDiagnosis.recommended_action === "tutor_referral" && (
            <div className="mt-3 rounded-lg bg-white/70 p-3">
              <p className="text-sm font-medium text-red-800">
                {studentFirstName} bu konuda tekrar tekrar zorlanıyor. İstersen özel ders talebinde bulunabilirsin.
              </p>
              <Link
                href={`/ogrenci/rapor/ozel-ders-talebi${data.studentId ? `?studentId=${data.studentId}` : ""}`}
                className="mt-1 inline-block text-sm font-semibold text-indigo-700 underline"
              >
                Özel Ders Talebi sayfasına git →
              </Link>
            </div>
          )}
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
