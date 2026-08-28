"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { TopicSelect } from "@/components/topic-select";

export function ParentTutorRequestForm({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [topicId, setTopicId] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.from("tutor_referrals").insert({
      student_id: studentId,
      topic_id: topicId || null,
      status: "pending",
    });
    setLoading(false);
    if (error) {
      setStatus(`Hata: ${error.message}`);
      return;
    }
    setStatus("Özel ders talebi oluşturuldu. Bir öğretmen üstlendiğinde burada göreceksin.");
    setTopicId("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-end sm:gap-3">
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700">Konu (opsiyonel)</label>
        <TopicSelect value={topicId} onChange={setTopicId} />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Gönderiliyor..." : "Özel Ders Talep Et"}
      </Button>
      {status && <p className="text-sm text-slate-600 sm:ml-3">{status}</p>}
    </form>
  );
}
