import Link from "next/link";
import { Card, Badge, StatCard } from "@/components/ui";
import { firstOf, type ReportData } from "@/lib/reports/report-data";
import { StudentReportCharts } from "@/components/report-charts";
import { SimpleTabs } from "@/components/simple-tabs";

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

const REFERRAL_LABEL: Record<string, string> = {
  pending: "Bekliyor",
  matched: "Öğretmen bulundu",
  scheduled: "Randevu planlandı",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

// Admin "Ogrenci Raporlari" detay ekraninda kullanilan, sekmeli rapor
// gorunumu - StudentReportView'daki tum bolumleri tek seferde alt alta
// gostermek yerine, her bolumu ayri bir sekmede sunuyor. Veli ve ogretmen
// taraflari hala eski (tek sayfa) StudentReportView'i kullaniyor, bu
// bilesen sadece admin listesinden secilen ogrenci detayinda gorunuyor.
export function StudentReportTabs({ data }: { data: ReportData }) {
  const genelTab = (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Çözülen Soru" value={data.totalSolved} hint={`${data.totalCorrect} doğru · ${data.totalWrong} yanlış`} />
        <StatCard label="Başarı Oranı" value={data.accuracy !== null ? `%${data.accuracy}` : "-"} />
        <StatCard label="İzlenen Konu Anlatımı" value={data.distinctContentViewed} />
        <StatCard label="Hedeflenen Kalan Soru" value={data.targetQuestionsRemaining} />
      </div>
      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Grafiklerle Rapor</h2>
        <StudentReportCharts data={data} />
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Genel Durum Raporu</h2>
        {data.overviewParagraphs.map((p, i) => (
          <p key={i} className="mb-1.5 text-sm text-slate-700 last:mb-0">
            {p}
          </p>
        ))}
      </Card>
    </div>
  );

  const programTab = (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-900">Çalışma Programı / Hedefler</h2>
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
                <span>
                  {p.target_questions} soru · {p.target_minutes} dk
                </span>
                <Badge tone={p.status === "done" ? "green" : p.status === "in_progress" ? "amber" : "default"}>
                  {p.status === "done" ? "Tamamlandı" : p.status === "in_progress" ? "Devam ediyor" : "Başlanmadı"}
                </Badge>
                {topic?.id && (
                  <Link href={`/ogrenci/konu/${topic.id}`} className="font-medium text-indigo-600 underline">
                    Konuya git →
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );

  const sinavlarTab = (
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
                {score !== null && <Badge tone={score >= 75 ? "green" : score >= 50 ? "amber" : "red"}>%{score}</Badge>}
                <span className="text-slate-400">{new Date(a.started_at).toLocaleDateString("tr-TR")}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );

  const izlemeTab = (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-900">Konu Anlatımı İzleme Geçmişi</h2>
      {!data.views.length && <p className="text-sm text-slate-500">Henüz konu anlatımı izlenmemiş.</p>}
      <ul className="flex flex-col gap-2">
        {data.views.map((v) => {
          const content = firstOf(v.lesson_contents);
          const topic = firstOf(content?.topics);
          return (
            <li key={v.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span>
                {topic?.name} — {content?.title}
              </span>
              <span className="text-xs text-slate-400">{new Date(v.viewed_at).toLocaleDateString("tr-TR")}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );

  const ozelDersTab = (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-900">Özel Ders Talepleri</h2>
      {!data.referrals.length && <p className="text-sm text-slate-500">Şu ana kadar özel ders talebi yok.</p>}
      <ul className="flex flex-col gap-2">
        {data.referrals.map((r) => {
          const topic = firstOf(r.topics);
          return (
            <li key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span>{topic?.name ?? "Genel"}</span>
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
  );

  const eksiklerTab = (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-900">Eksikler / Analiz Geçmişi</h2>
      {!data.diagnoses.length && <p className="text-sm text-slate-500">Henüz analiz yok.</p>}
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
                    ✓ Öğrenci okudu —{" "}
                    {new Date(d.acknowledged_at).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
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
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{data.studentProfile?.full_name}</h1>
        <p className="text-sm text-slate-500">
          {data.studentProfile?.grade_level ? `${data.studentProfile.grade_level}. sınıf` : "sınıf belirtilmemiş"} · Hedef:{" "}
          {data.studentProfile?.exam_target ?? "belirtilmemiş"}
        </p>
      </div>
      <div>
        <Badge tone={data.overallTone}>Genel durum: {data.overallLabel}</Badge>
      </div>
      <SimpleTabs
        defaultKey="genel"
        tabs={[
          { key: "genel", label: "Genel Durum Raporu", content: genelTab },
          { key: "program", label: "Çalışma Programı / Hedefler", content: programTab },
          { key: "sinavlar", label: "Geçmiş Sınav Sonuçları", content: sinavlarTab },
          { key: "izleme", label: "Konu Anlatımı İzleme Geçmişi", content: izlemeTab },
          { key: "ozel-ders", label: "Özel Ders Talepleri", content: ozelDersTab },
          { key: "eksikler", label: "Eksikler / Analiz Geçmişi", content: eksiklerTab },
        ]}
      />
    </div>
  );
}
