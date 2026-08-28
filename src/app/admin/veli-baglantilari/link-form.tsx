"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Select } from "@/components/ui";

type Person = { id: string; full_name: string; email: string };

export function LinkForm({ parents, students }: { parents: Person[]; students: Person[] }) {
  const router = useRouter();
  const [parentId, setParentId] = useState(parents[0]?.id ?? "");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parentId || !studentId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("parent_student_links")
      .insert({ parent_id: parentId, student_id: studentId });
    setLoading(false);
    if (insertError) {
      setError(insertError.code === "23505" ? "Bu bağlantı zaten var." : insertError.message);
      return;
    }
    router.refresh();
  }

  if (!parents.length || !students.length) {
    return (
      <Card>
        <p className="text-sm text-slate-500">Bağlantı oluşturmak için en az bir veli ve bir öğrenci hesabı olmalı.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-900">Yeni Bağlantı Ekle</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Veli</label>
          <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Öğrenci</label>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Ekleniyor..." : "Bağla"}</Button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
