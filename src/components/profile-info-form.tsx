"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Select } from "@/components/ui";
import { examTargetsForGrade } from "@/lib/exam-targets";

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
  // Baslangic degeri "TYT" olarak sabitlenmisti - bu, 7. sinif ve altindaki
  // (hedef sinav secenegi sadece "DIGER" olan) bir ogrenci icin, ekranda
  // "DIGER" gorunse bile state'in gercekte gecersiz "TYT" degerinde kalmasina
  // ve kaydet'e basinca sunucudan "Geçerli bir hedef sınav seç." hatasi
  // almasina yol aciyordu (select DOM'da otomatik en yakin secenegi
  // gosteriyor ama React state onChange tetiklenmedigi icin guncellenmiyordu).
  // Artik baslangic degeri, gercek sinifa gore gecerli olan ilk secenege
  // gore hesaplaniyor.
  const initialOptions = examTargetsForGrade(initialGradeLevel);
  const [examTarget, setExamTarget] = useState(
    initialExamTarget && initialOptions.includes(initialExamTarget) ? initialExamTarget : initialOptions[0]
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Her sinifta her sinav anlamli degil (ör. LGS sadece 8. sinifta,
  // KPSS/ALES sadece 12. sinifta secilebilir) - sinif degistiginde secili
  // hedef sinav artik listede yoksa (asagidaki handleGradeChange icinde)
  // otomatik olarak o sinif icin en uygun ilk secenege geciyoruz, boylece
  // kullanici gecersiz bir kombinasyonla kaydetmiş olmuyor.
  const examOptions = examTargetsForGrade(Number(gradeLevel));

  function handleGradeChange(value: string) {
    setGradeLevel(value);
    const nextOptions = examTargetsForGrade(Number(value));
    if (!nextOptions.includes(examTarget)) {
      setExamTarget(nextOptions[0]);
    }
  }

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
          <Select value={gradeLevel} onChange={(e) => handleGradeChange(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>
                {g}. sınıf
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Hedef sınav</label>
          {examOptions.length > 1 ? (
            <Select value={examTarget} onChange={(e) => setExamTarget(e.target.value)}>
              {examOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          ) : (
            // Bu sinif seviyesinde (7. sinif ve alti) secilecek anlamli bir
            // sinav yok - tek secenekli, kafa karistiran bir dropdown yerine
            // durumu aciklayan sabit bir metin gosteriyoruz. examTarget zaten
            // yukarida otomatik olarak "DIGER" olarak ayarlaniyor.
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Bu sınıf seviyesi için özel bir hedef sınav yok
            </p>
          )}
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
