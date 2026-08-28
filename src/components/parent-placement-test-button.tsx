"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

// Veli, "ogrenci ilk geldiginde" (henuz hic soru cozmemisken) bir seviye
// tespit sinavi baslatabiliyor: ogrencinin sinif seviyesine uygun, farkli
// derslerden birkac konuyu "hedef" olarak calisma programina ekliyoruz
// (source: 'placement'). Ogrenci bu konularin testini cozdukce mevcut
// eksik tespiti (diagnoses) mekanizmasi zaten devreye giriyor.
export function ParentPlacementTestButton({ studentId, gradeLevel }: { studentId: string; gradeLevel: number | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    let topicsQuery = supabase.from("topics").select("id, subject_id, name").order("subject_id");
    topicsQuery = gradeLevel ? topicsQuery.eq("grade_level", gradeLevel) : topicsQuery;
    const { data: topics, error: topicsError } = await topicsQuery.limit(60);

    if (topicsError) {
      setLoading(false);
      setError(`Hata: ${topicsError.message}`);
      return;
    }
    if (!topics?.length) {
      setLoading(false);
      setError("Bu sınıf seviyesi için henüz konu eklenmemiş.");
      return;
    }

    // Her dersten bir konu olacak sekilde en fazla 5 farkli konu sec.
    const seenSubjects = new Set<string>();
    const selected = [];
    for (const t of topics) {
      if (seenSubjects.has(t.subject_id)) continue;
      seenSubjects.add(t.subject_id);
      selected.push(t);
      if (selected.length >= 5) break;
    }

    let plan: { id: string } | null = null;
    const { data: existingPlan } = await supabase
      .from("study_plans")
      .select("id")
      .eq("student_id", studentId)
      .eq("status", "active")
      .maybeSingle();
    plan = existingPlan;

    if (!plan) {
      const { data: newPlan, error: planError } = await supabase
        .from("study_plans")
        .insert({ student_id: studentId, exam_target: "TYT" })
        .select("id")
        .single();
      if (planError) {
        setLoading(false);
        setError(`Hata: ${planError.message}`);
        return;
      }
      plan = newPlan;
    }

    const { error: insertError } = await supabase.from("study_plan_items").insert(
      selected.map((t) => ({
        plan_id: plan!.id,
        topic_id: t.id,
        target_questions: 5,
        target_minutes: 15,
        source: "placement",
      }))
    );

    setLoading(false);
    if (insertError) {
      setError(`Hata: ${insertError.message}`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleClick} disabled={loading} variant="secondary" className="self-start">
        {loading ? "Oluşturuluyor..." : "Seviye Tespit Sınavı Ata"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
