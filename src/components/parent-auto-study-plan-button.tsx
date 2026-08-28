"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

// Veli tek tikla, ogrencinin mevcut eksik analizlerine (diagnoses) gore
// otomatik bir calisma programi onerisi olusturabiliyor: "major" eksikler
// icin daha yuklu, "minor" eksikler icin daha hafif hedefler eklenir
// (source: 'auto'). Zaten aktif hedefi olan konular tekrar eklenmez.
export function ParentAutoStudyPlanButton({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    const { data: diagnoses, error: diagError } = await supabase
      .from("diagnoses")
      .select("topic_id, weakness_level, created_at")
      .eq("student_id", studentId)
      .in("weakness_level", ["minor", "major"])
      .order("created_at", { ascending: false });

    if (diagError) {
      setLoading(false);
      setMessage(`Hata: ${diagError.message}`);
      return;
    }

    // Her konu icin en guncel eksik seviyesini al.
    const latestByTopic = new Map<string, string>();
    for (const d of diagnoses ?? []) {
      if (!latestByTopic.has(d.topic_id)) latestByTopic.set(d.topic_id, d.weakness_level);
    }

    if (latestByTopic.size === 0) {
      setLoading(false);
      setMessage("Şu an önerilecek bir eksik bulunamadı - önce birkaç konu testi çözülmesi gerekiyor.");
      return;
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
        setMessage(`Hata: ${planError.message}`);
        return;
      }
      plan = newPlan;
    }

    const { data: existingItems } = await supabase
      .from("study_plan_items")
      .select("topic_id")
      .eq("plan_id", plan!.id)
      .neq("status", "done");
    const alreadyPlanned = new Set((existingItems ?? []).map((i) => i.topic_id));

    const toInsert = Array.from(latestByTopic.entries())
      .filter(([topicId]) => !alreadyPlanned.has(topicId))
      .map(([topicId, level]) => ({
        plan_id: plan!.id,
        topic_id: topicId,
        target_questions: level === "major" ? 15 : 8,
        target_minutes: level === "major" ? 30 : 15,
        source: "auto",
      }));

    if (toInsert.length === 0) {
      setLoading(false);
      setMessage("Eksik çıkan konuların hepsi zaten çalışma programında.");
      return;
    }

    const { error: insertError } = await supabase.from("study_plan_items").insert(toInsert);
    setLoading(false);
    if (insertError) {
      setMessage(`Hata: ${insertError.message}`);
      return;
    }
    setMessage(`${toInsert.length} yeni hedef eklendi.`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleClick} disabled={loading} variant="secondary" className="self-start">
        {loading ? "Oluşturuluyor..." : "Eksiklere Göre Otomatik Program Oluştur"}
      </Button>
      {message && <p className="text-xs text-slate-600">{message}</p>}
    </div>
  );
}
