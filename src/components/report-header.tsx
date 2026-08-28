import { Card, Badge } from "@/components/ui";
import { StudentSwitcher } from "@/components/student-switcher";
import { AddChildForm } from "@/components/add-child-form";
import type { ReportData } from "@/lib/reports/report-data";

export function ReportHeader({ data }: { data: ReportData }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{data.pageTitle}</h1>
        <p className="text-sm text-slate-500">
          {data.studentProfile?.full_name} ·{" "}
          {data.studentProfile?.grade_level ? `${data.studentProfile.grade_level}. sınıf` : "sınıf belirtilmemiş"} · Hedef:{" "}
          {data.studentProfile?.exam_target ?? "belirtilmemiş"}
        </p>
      </div>

      {data.role === "parent" && data.showAddChild && (
        <Card>
          <h2 className="mb-2 font-semibold text-slate-900">Öğrenci Ekle</h2>
          <p className="mb-3 text-xs text-slate-500">Birden fazla çocuğun varsa hepsini buradan ekleyip aralarında geçiş yapabilirsin.</p>
          <AddChildForm />
        </Card>
      )}

      {data.studentId && (
        <StudentSwitcher
          candidates={data.candidates}
          currentId={data.studentId}
          label={data.role === "admin" ? "Öğrenci seç" : "Çocuk seç"}
        />
      )}

      <div>
        <Badge tone={data.overallTone}>Genel durum: {data.overallLabel}</Badge>
      </div>
    </div>
  );
}
