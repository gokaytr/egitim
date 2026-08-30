"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

// Tek bir konu icin "biliyorum, test et" / "bilmiyorum, programa ekle"
// aksiyonlari. topic-picker.tsx'teki mantigin ayni sekilde, tek bir konu
// icin (dropdown olmadan) calisan hali - ders bazli konu listesinde
// her konu karti kendi butonlarina sahip olsun diye ayrildi.
export function TopicActions({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDontKnow() {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

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
    setMessage("Çalışma programına eklendi.");
  }

  function handleKnowIt() {
    router.push(`/ogrenci/konu/${topicId}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleKnowIt} disabled={loading} className="text-xs">
          Biliyorum, test et
        </Button>
        <Button variant="secondary" onClick={handleDontKnow} disabled={loading} className="text-xs">
          Bilmiyorum, programa ekle
        </Button>
        <Link
          href={`/ogrenci/konu/${topicId}/cevaplar`}
          className="flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          Cevaplar
        </Link>
      </div>
      {message && <p className="text-xs text-slate-500">{message}</p>}
    </div>
  );
}
