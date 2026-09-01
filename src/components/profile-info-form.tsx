"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Select } from "@/components/ui";

const EXAM_TARGETS = ["LGS", "TYT", "AYT", "YKS", "YDT", "KPSS", "ALES", "DIGER"];

// Ozellikle Google ile uye olan ogrencilerde kayit sirasinda alinamayan
// sinif/hedef sinav bilgisini tamamlamak icin kullaniliyor. Bilgi eksikken
// (initialGradeLevel/initialExamTarget null) formun ustunde uyari metni
// gosteriliyor; doldurulduktan sonra ayni form normal bir "bilgilerini
// guncelle" formu olarak kalmaya devam ediyor. Admin bir test ogrenciyi
// onizlerken `studentId` gecilir - QuizSettingsForm'daki ayni desen.
export function ProfileInfoForm({
  initialGradeLevel,
  initialExamTarget,
  studentId,
}: {
  initialGradeLevel: number | null;
  initialExamTarget: string | null;
  studentId?: string;
}) {
  const router = useRouter();
  const missing = initialGradeLevel == null || !initialExamTarget;
  const [gradeLevel, setGradeLevel] = useState(String(initialGradeLevel ?? 9));
  const [examTarget, setExamTarget] = useState(initialExamTarget ?? "TYT");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/student/profile-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeLevel: Number(gradeLevel),
          examTarget,
          ...(studentId ? { studentId } : {}),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Bilgiler kaydedilemedi.");
      setSavedAt(Date.now());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bilgiler kaydedilirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex max-w-xl flex-col gap-4">
      <div>
        <h2 className="font-semibold text-slate-900">Sınıf ve Hedef Sınav</h2>
        {missing ? (
          <p className="mt-1 text-sm text-amber-600">
            Sınıf ve hedef sınav bilgin eksik görünüyor. Sana uygun konu ve soruları gösterebilmemiz için bu
            bilgileri tamamlaman gerekiyor.
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            Sana gösterilen konu ve sorular bu bilgilere göre belirlenir. Sınıf değiştiyse veya hedef sınavın
            değiştiyse buradan güncelleyebilirsin.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Sınıf</label>
          <Select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>
                {g}. sınıf
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Hedef sınav</label>
          <Select value={examTarget} onChange={(e) => setExamTarget(e.target.value)}>
            {EXAM_TARGETS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="w-fit">
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
        {savedAt && <span className="text-sm text-emerald-600">Kaydedildi ✓</span>}
      </div>
    </Card>
  );
}
