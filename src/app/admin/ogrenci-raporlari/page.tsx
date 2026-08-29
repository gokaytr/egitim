import Link from "next/link";
import { Card } from "@/components/ui";
import { AdminStudentReportList } from "@/components/admin-student-report-list";
import { StudentReportTabs } from "@/components/student-report-tabs";
import { loadStaffStudentList, loadStaffStudentReport } from "@/lib/reports/report-data";

export default async function AdminOgrenciRaporlariPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const { studentId } = await searchParams;

  if (!studentId) {
    const { students } = await loadStaffStudentList();
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Öğrenci Raporları</h1>
          <p className="text-sm text-slate-500">Detaylı raporunu görmek için listeden bir öğrenci seç.</p>
        </div>
        {!students.length ? (
          <Card>
            <p className="text-sm text-slate-500">Henüz kayıtlı öğrenci yok.</p>
          </Card>
        ) : (
          <AdminStudentReportList students={students} />
        )}
      </div>
    );
  }

  const data = await loadStaffStudentReport(studentId);

  if ("needsSetup" in data) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{data.pageTitle}</h1>
        </div>
        <Card>
          <p className="text-sm text-slate-500">Henüz kayıtlı öğrenci yok.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/ogrenci-raporlari" className="text-sm font-medium text-indigo-600 underline">
        ← Öğrenci listesine dön
      </Link>
      <StudentReportTabs data={data} />
    </div>
  );
}
