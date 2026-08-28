import { Card, Badge } from "@/components/ui";
import { ReportHeader } from "@/components/report-header";
import { ParentTutorRequestForm } from "@/components/parent-tutor-request-form";
import { ParentTutorCancelButton } from "@/components/parent-tutor-cancel-button";
import { loadReportData, firstOf } from "@/lib/reports/report-data";

const REFERRAL_LABEL: Record<string, string> = {
  pending: "Bekliyor",
  matched: "Öğretmen bulundu",
  scheduled: "Randevu planlandı",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

export default async function OzelDersTalebiPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
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
        <h2 className="mb-3 font-semibold text-slate-900">Özel Ders Talebi</h2>
        <p className="mb-3 text-xs text-slate-500">
          Talebin ilgili branş öğretmenlerine ve yönetici paneline düşer; öğretmen onayladığında burada ve
          öğretmenin takviminde randevu bilgisi görünür.
        </p>
        {!data.referrals.length && <p className="text-sm text-slate-500">Şu ana kadar özel ders talebi oluşturulmadı.</p>}
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
                {data.role === "parent" && ["pending", "matched", "scheduled"].includes(r.status) && (
                  <div className="mt-1.5">
                    <ParentTutorCancelButton referralId={r.id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {data.role === "parent" && <ParentTutorRequestForm studentId={data.studentId} />}
      </Card>
    </div>
  );
}
