"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Input, Select } from "@/components/ui";

type Subject = { id: string; name: string };
type Course = { id: string; name: string };

export function TopicAddForm({ subjects, courses }: { subjects: Subject[]; courses: Course[] }) {
  const router = useRouter();
  const [gradeLevel, setGradeLevel] = useState(5);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [estimatedMinutes, setEstimatedMinutes] = useState(20);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function toggleCourse(courseName: string) {
    setSelectedCourses((prev) => (prev.includes(courseName) ? prev.filter((c) => c !== courseName) : [...prev, courseName]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId) {
      setStatus("Önce bir ders seçin.");
      return;
    }
    setLoading(true);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.from("topics").insert({
      subject_id: subjectId,
      name,
      grade_level: gradeLevel,
      difficulty_level: difficulty,
      estimated_minutes: estimatedMinutes,
      exam_types: selectedCourses,
    });
    setLoading(false);
    if (error) {
      setStatus(`Hata: ${error.message}`);
      return;
    }
    setStatus("Konu eklendi.");
    setName("");
    setSelectedCourses([]);
    router.refresh();
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-900">Konu Ekle</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Sınıf</label>
            <Select value={gradeLevel} onChange={(e) => setGradeLevel(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>{g}. sınıf</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ders</label>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
        </div>

        <Input required placeholder="Konu adı (örn. Üçgende Açılar)" value={name} onChange={(e) => setName(e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Zorluk (1-5)</label>
            <Select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tahmini süre (dk)</label>
            <Input type="number" min={5} step={5} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(Number(e.target.value))} />
          </div>
        </div>

        {courses.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Kurs(lar) (opsiyonel)</label>
            <div className="flex flex-wrap gap-2">
              {courses.map((c) => (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    selectedCourses.includes(c.name)
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedCourses.includes(c.name)}
                    onChange={() => toggleCourse(c.name)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <Button type="submit" disabled={loading}>{loading ? "Ekleniyor..." : "Konuyu Ekle"}</Button>
      </form>
      {status && <p className="mt-2 text-sm text-slate-600">{status}</p>}
    </Card>
  );
}
