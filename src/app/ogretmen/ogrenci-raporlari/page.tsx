import { Card } from "@/components/ui";
import { ReportHeader } from "@/components/report-header";
import { StudentReportView } from "@/components/student-report-view";
import { loadStaffStudentReport } from "@/lib/reports/report-data";

export default async function OgretmenOgrenciRaporlariPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const { studentId } = await searchParams;
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
      <ReportHeader data={data} />
      <StudentReportView data={data} />
    </div>
  );
}
