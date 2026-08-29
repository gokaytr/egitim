import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, StatCard } from "@/components/ui";
import { TeacherApprovalButtons } from "./teacher-approval-buttons";
import { SimpleTabs } from "@/components/simple-tabs";
import { TeacherSubjectManager } from "@/components/teacher-subject-manager";
import { loadTeacherActivityReport } from "@/lib/reports/teacher-activity";

export default async function OgretmenBasvurulariPage() {
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("teacher_pending", true)
    .order("created_at", { ascending: false });

  const rows = await loadTeacherActivityReport();
  const totalQuestions = rows.reduce((s, r) => s + r.questionsAdded, 0);
  const totalApprovedQuestions = rows.reduce((s, r) => s + r.questionsApproved, 0);
  const totalLessonContents = rows.reduce((s, r) => s + r.lessonContentsAdded, 0);
  const totalCompletedReferrals = rows.reduce((s, r) => s + r.referralsCompleted, 0);
  const totalTutorSessionHours = Math.round(rows.reduce((s, r) => s + r.tutorSessionHours, 0) * 10) / 10;

  const [{ data: teacherProfiles }, { data: subjects }, { data: assignments }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, is_demo").eq("role", "teacher").order("full_name"),
    supabase.from("subjects").select("id, name").order("name"),
    supabase.from("teacher_subjects").select("teacher_id, subject_id"),
  ]);

  const testTeachers = (teacherProfiles ?? []).filter((t) => t.is_demo);
  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const subjectNamesByTeacherId = new Map<string, string[]>();
  for (const a of assignments ?? []) {
    const name = subjectNameById.get(a.subject_id);
    if (!name) continue;
    const list = subjectNamesByTeacherId.get(a.teacher_id) ?? [];
    list.push(name);
    subjectNamesByTeacherId.set(a.teacher_id, list);
  }

  const basvurularTab = (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-500">
        Kayıt sırasında &quot;Öğretmenim&quot; seçen kullanıcılar onaylanmadan öğretmen paneline giremez.
      </p>
      {pending?.map((p) => (
        <Card key={p.id} className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900">{p.full_name}</p>
            <p className="text-sm text-slate-500">{p.email}</p>
            <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString("tr-TR")}</p>
          </div>
          <TeacherApprovalButtons profileId={p.id} />
        </Card>
      ))}
      {!pending?.length && <p className="text-sm text-slate-500">Onay bekleyen öğretmen başvurusu yok.</p>}
    </div>
  );

  const aktiviteTab = (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-500">Her öğretmenin tek tek ne katkı sağladığının kaydı.</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Aktif Öğretmen" value={rows.length} />
        <StatCard label="Eklenen Soru" value={totalQuestions} />
        <StatCard label="Onaylanan Soru" value={totalApprovedQuestions} />
        <StatCard label="Eklenen Konu Anlatımı" value={totalLessonContents} />
        <StatCard label="Tamamlanan Özel Ders" value={totalCompletedReferrals} />
        <StatCard label="Toplam Özel Ders Saati" value={totalTutorSessionHours} />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Öğretmen</th>
              <th className="px-5 py-3 font-medium">Branşlar</th>
              <th className="px-5 py-3 font-medium">Atanan Öğrenci</th>
              <th className="px-5 py-3 font-medium">Eklenen Soru</th>
              <th className="px-5 py-3 font-medium">Onayladığı Soru</th>
              <th className="px-5 py-3 font-medium">Konu Anlatımı</th>
              <th className="px-5 py-3 font-medium">Özel Ders Durumu</th>
              <th className="px-5 py-3 font-medium">Özel Ders Adedi</th>
              <th className="px-5 py-3 font-medium">Toplam Saat</th>
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
                <td className="px-5 py-3 text-slate-600">{r.questionsApproved}</td>
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
                <td className="px-5 py-3 text-slate-600">{r.tutorSessionCount}</td>
                <td className="px-5 py-3 text-slate-600">{r.tutorSessionHours}</td>
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

  const bransTab = (
    <TeacherSubjectManager teachers={teacherProfiles ?? []} subjects={subjects ?? []} assignments={assignments ?? []} />
  );

  const testOgretmenlerTab = (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-slate-500">
        Her branş için birer demo öğretmen hesabı. Bu hesaplar Branş Atamaları sekmesinde de atanabilir. Görüntüle
        bağlantısına tıklayarak o öğretmenin gerçek panelini tek tıkla görebilirsin.
      </p>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Ad Soyad</th>
              <th className="px-5 py-3 font-medium">Branş</th>
              <th className="px-5 py-3 font-medium">E-posta</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {testTeachers.map((t) => (
              <tr key={t.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-3 font-medium text-slate-900">{t.full_name}</td>
                <td className="px-5 py-3 text-slate-600">
                  {(subjectNamesByTeacherId.get(t.id) ?? []).join(", ") || <span className="text-slate-400">-</span>}
                </td>
                <td className="px-5 py-3 text-slate-600">{t.email}</td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/ogretmen?teacherId=${t.id}`} className="font-medium text-indigo-600 underline">
                    Görüntüle →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!testTeachers.length && <p className="p-5 text-sm text-slate-500">Henüz test öğretmen yok.</p>}
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Öğretmenler</h1>
        <p className="text-sm text-slate-500">Öğretmen başvuruları, branş atamaları ve öğretmenlerin platformdaki aktivite kaydı.</p>
      </div>

      <SimpleTabs
        defaultKey="basvurular"
        tabs={[
          { key: "basvurular", label: "Öğretmen Başvuruları", content: basvurularTab },
          { key: "brans", label: "Branş Atamaları", content: bransTab },
          { key: "aktivite", label: "Öğretmen Aktivitesi", content: aktiviteTab },
          { key: "test-ogretmenler", label: "Test Öğretmenler", content: testOgretmenlerTab },
        ]}
      />
    </div>
  );
}