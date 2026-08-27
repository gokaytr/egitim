"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TopicSelect } from "@/components/topic-select";
import { Button } from "@/components/ui";

export function TopicPicker() {
  const router = useRouter();
  const [topicId, setTopicId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDontKnow() {
    if (!topicId) return setMessage("Önce bir konu seçin.");
    setLoading(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    // Aktif bir çalışma planı yoksa oluştur
    let { data: plan } = await supabase
      .from("study_plans")
      .select("id")
      .eq("student_id", userData.user?.id)
      .eq("status", "active")
      .maybeSingle();

    if (!plan) {
      const { data: profile } = await supabase.from("profiles").select("exam_target").eq("id", userData.user?.id).single();
      const { data: newPlan } = await supabase
        .from("study_plans")
        .insert({ student_id: userData.user?.id, exam_target: profile?.exam_target ?? "TYT" })
        .select("id")
        .single();
      plan = newPlan;
    }

    if (plan) {
      await supabase.from("study_plan_items").insert({ plan_id: plan.id, topic_id: topicId });
    }

    setLoading(false);
    setMessage("Bu konu çalışma programına eklendi. Konu anlatımını görmek için öğretmen içeriklerine göz atabilirsin.");
  }

  function handleKnowIt() {
    if (!topicId) return setMessage("Önce bir konu seçin.");
    router.push(`/ogrenci/konu/${topicId}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-md">
        <TopicSelect value={topicId} onChange={setTopicId} />
      </div>
      <div className="flex gap-3">
        <Button onClick={handleKnowIt} disabled={loading}>
          Bu konuyu biliyorum, test et
        </Button>
        <Button variant="secondary" onClick={handleDontKnow} disabled={loading}>
          Bu konuyu bilmiyorum, programa ekle
        </Button>
      </div>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </div>
  );
}
