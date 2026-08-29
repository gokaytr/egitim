"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";

type Teacher = { id: string; full_name: string };
type Student = { id: string; full_name: string };

export function TeacherStudentManager({
  teachers,
  students,
  assignments,
}: {
  teachers: Teacher[];
  students: Student[];
  assignments: { teacher_id: string; student_id: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function assignedTeacherId(studentId: string) {
    return assignments.find((a) => a.student_id === studentId)?.teacher_id ?? "";
  }

  async function onChange(studentId: string, newTeacherId: string) {
    const previousTeacherId = assignedTeacherId(studentId);
    setPending(studentId);
    setError(null);
    const supabase = createClient();

    if (previousTeacherId) {
      const { error: delErr } = await supabase
        .from("teacher_students")
        .delete()
        .eq("teacher_id", previousTeacherId)
        .eq("student_id", studentId);
      if (delErr) {
        setPending(null);
        setError(delErr.message);
        return;
      }
    }

    if (newTeacherId) {
      const { error: insErr } = await supabase
        .from("teacher_students")
        .insert({ teacher_id: newTeacherId, student_id: studentId });
      if (insErr) {
        setPending(null);
        setError(insErr.message);
        return;
      }
    }

    setPending(null);
    router.refresh();
  }

  if (!teachers.length) {
    return (
      <Card>
        <h2 className="mb-1 font-semibold text-slate-900">Öğretmen — Öğrenci Atamaları</h2>
        <p className="text-sm text-slate-500">Henüz onaylı bir öğretmen hesabı yok.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto">
      <h2 className="mb-1 font-semibold text-slate-900">Öğretmen — Öğrenci Atamaları</h2>
      <p className="mb-3 text-xs text-slate-500">
        Her öğrenciye “öğrenci durumu” ekranlarında görebileceği bir öğretmen ata. Bu, branş atamasından
        (Öğretmen Branş Atamaları) ayrı - öğretmen sadece burada kendisine atanan öğrencilerin raporunu görür.
      </p>
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="border-b border-slate-100 text-slate-500">
          <tr>
            <th className="py-2 pr-3 font-medium">Öğrenci</th>
            <th className="py-2 pr-3 font-medium">Atanan Öğretmen</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const current = assignedTeacherId(s.id);
            return (
              <tr key={s.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2 pr-3 font-medium text-slate-800">{s.full_name}</td>
                <td className="py-2 pr-3">
                  <select
                    className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                    value={current}
                    disabled={pending === s.id}
                    onChange={(e) => onChange(s.id, e.target.value)}
                  >
                    <option value="">— Atanmadı —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!students.length && <p className="mt-2 text-sm text-slate-500">Henüz kayıtlı öğrenci yok.</p>}
      {error && <p className="mt-2 text-sm text-red-600">Hata: {error}</p>}
    </Card>
  );
}
