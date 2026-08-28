"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";

type Teacher = { id: string; full_name: string };
type Subject = { id: string; name: string };

export function TeacherSubjectManager({
  teachers,
  subjects,
  assignments,
}: {
  teachers: Teacher[];
  subjects: Subject[];
  assignments: { teacher_id: string; subject_id: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function isAssigned(teacherId: string, subjectId: string) {
    return assignments.some((a) => a.teacher_id === teacherId && a.subject_id === subjectId);
  }

  async function toggle(teacherId: string, subjectId: string, currentlyAssigned: boolean) {
    const key = `${teacherId}-${subjectId}`;
    setPending(key);
    setError(null);
    const supabase = createClient();
    const { error: err } = currentlyAssigned
      ? await supabase.from("teacher_subjects").delete().eq("teacher_id", teacherId).eq("subject_id", subjectId)
      : await supabase.from("teacher_subjects").insert({ teacher_id: teacherId, subject_id: subjectId });
    setPending(null);
    if (err) {
      setError(err.message);
      return;
    }
    router.refresh();
  }

  if (!teachers.length) {
    return (
      <Card>
        <h2 className="mb-1 font-semibold text-slate-900">Öğretmen Branş Atamaları</h2>
        <p className="text-sm text-slate-500">Henüz onaylı bir öğretmen hesabı yok.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto">
      <h2 className="mb-1 font-semibold text-slate-900">Öğretmen Branş Atamaları</h2>
      <p className="mb-3 text-xs text-slate-500">
        Bir öğretmen birden fazla branşa atanabilir. Atanan branşların konuları o öğretmenin ekranlarında öne çıkar.
      </p>
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="border-b border-slate-100 text-slate-500">
          <tr>
            <th className="py-2 pr-3 font-medium">Öğretmen</th>
            {subjects.map((s) => (
              <th key={s.id} className="px-2 py-2 text-center font-medium">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teachers.map((t) => (
            <tr key={t.id} className="border-b border-slate-50 last:border-0">
              <td className="py-2 pr-3 font-medium text-slate-800">{t.full_name}</td>
              {subjects.map((s) => {
                const assigned = isAssigned(t.id, s.id);
                const key = `${t.id}-${s.id}`;
                return (
                  <td key={s.id} className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={assigned}
                      disabled={pending === key}
                      onChange={() => toggle(t.id, s.id, assigned)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {error && <p className="mt-2 text-sm text-red-600">Hata: {error}</p>}
    </Card>
  );
}
