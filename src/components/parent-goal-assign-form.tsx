"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";
import { TopicSelect } from "@/components/topic-select";

export function ParentGoalAssignForm({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [topicId, setTopicId] = useState("");
  const [targetQuestions, setTargetQuestions] = useState(20);
  const [targetMinutes, setTargetMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topicId) {
      setStatus("Önce bir konu seç.");
      return;
    }
    setLoading(true);
    setStatus(null);
    const supabase = createClient();

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
        setStatus(`Hata: ${planError.message}`);
        return;
      }
      plan = newPlan;
    }

    const { error } = await supabase.from("study_plan_items").insert({
      plan_id: plan!.id,
      topic_id: topicId,
      target_questions: targetQuestions,
      target_minutes: targetMinutes,
    });
    setLoading(false);
    if (error) {
      setStatus(`Hata: ${error.message}`);
      return;
    }
    setStatus("Hedef eklendi.");
    setTopicId("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 rounded-lg bg-slate-50 p-3">
      <label className="text-sm font-medium text-slate-700">Öğrenciye soru ata</label>
      <p className="-mt-1 text-xs text-slate-500">
        Bir konu seç, kaç soru ve kaç dakika çalışması gerektiğini belirle. Atanan konu öğrencinin
        panelinde "Hedeflerim" altında, doğrudan soru çözme sayfasına götüren bir bağlantıyla görünür.
      </p>
      <TopicSelect value={topicId} onChange={setTopicId} />
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          min={1}
          value={targetQuestions}
          onChange={(e) => setTargetQuestions(Number(e.target.value))}
          placeholder="Hedef soru sayısı"
        />
        <Input
          type="number"
          min={5}
          step={5}
          value={targetMinutes}
          onChange={(e) => setTargetMinutes(Number(e.target.value))}
          placeholder="Hedef süre (dk)"
        />
      </div>
      <Button type="submit" disabled={loading} className="self-start">
        {loading ? "Atanıyor..." : "Soru Ata"}
      </Button>
      {status && <p className="text-sm text-slate-600">{status}</p>}
    </form>
  );
}
