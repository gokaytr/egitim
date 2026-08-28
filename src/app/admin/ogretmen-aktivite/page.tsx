import { Card, Badge, StatCard } from "@/components/ui";
import { loadTeacherActivityReport } from "@/lib/reports/teacher-activity";

// Admin paneli: her ogretmenin tek tek ne yaptiginin kaydi - eklediği soru
// sayisi, eklediği konu anlatimi, kendisine atanan ogrenci sayisi ve ozel
// ders (tutor_referrals) durum dagilimi. "ögretmenlerin ne yaptıgı tek tek
// kayıt altında raporlanabilir olsun" istegini karsiliyor.
export default async function OgretmenAktivitePage() {
  const rows = await loadTeacherActivityReport();

  const totalQuestions = rows.reduce((s, r) => s + r.questionsAdded, 0);
  const totalLessonContents = rows.reduce((s, r) => s + r.lessonContentsAdded, 0);
  const totalStudents = rows.reduce((s, r) => s + r.assignedStudentCount, 0);
  const totalCompletedReferrals = rows.reduce((s, r) => s + r.referralsCompleted, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Öğretmen Aktivitesi</h1>
        <p className="text-sm text-slate-500">Her öğretmenin tek tek ne katkı sağladığının kaydı.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Aktif Öğretmen" value={rows.length} />
        <StatCard label="Eklenen Soru" value={totalQuestions} />
        <StatCard label="Eklenen Konu Anlatımı" value={totalLessonContents} />
        <StatCard label="Tamamlanan Özel Ders" value={totalCompletedReferrals} />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Öğretmen</th>
              <th className="px-5 py-3 font-medium">Branşlar</th>
              <th className="px-5 py-3 font-medium">Atanan Öğrenci</th>
              <th className="px-5 py-3 font-medium">Eklenen Soru</th>
              <th className="px-5 py-3 font-medium">Konu Anlatımı</th>
              <th className="px-5 py-3 font-medium">Özel Ders</th>
              <th className="px-5 py-3 font-medium">Son Aktivite</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.teacherId} className="border-b border-slate-50 last:border-0 align-top">
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-900">{r.fullName}</div>
                  {r.email && <div className="text-xs text-slate-400">{r.email}</div>}
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {r.subjects.length ? r.subjects.join(", ") : <span className="text-slate-400">-</span>}
                </td>
                <td className="px-5 py-3 text-slate-600">{r.assignedStudentCount}</td>
                <td className="px-5 py-3 text-slate-600">{r.questionsAdded}</td>
                <td className="px-5 py-3 text-slate-600">{r.lessonContentsAdded}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {r.referralsCompleted > 0 && <Badge tone="green">{r.referralsCompleted} tamamlandı</Badge>}
                    {r.referralsMatched > 0 && <Badge tone="amber">{r.referralsMatched} devam ediyor</Badge>}
                    {r.referralsPending > 0 && <Badge tone="red">{r.referralsPending} bekliyor</Badge>}
                    {r.referralsCompleted === 0 && r.referralsMatched === 0 && r.referralsPending === 0 && (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-400">
                  {r.lastActivityAt ? new Date(r.lastActivityAt).toLocaleDateString("tr-TR") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-5 text-sm text-slate-500">Henüz öğretmen kaydı yok.</p>}
      </Card>
    </div>
  );
}
