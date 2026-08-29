"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/ui";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Beklemede" },
  { value: "in_progress", label: "Devam Ediyor" },
  { value: "done", label: "Tamamlandı" },
];

export function AdminTaskStatusSelect({ taskId, title, status }: { taskId: string; title: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(value: string) {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("admin_tasks").update({ status: value, updated_at: new Date().toISOString() }).eq("id", taskId);
    setLoading(false);

    // Admine bildirim denemesi - sonucunu beklemiyoruz, hata olsa da yutuluyor.
    fetch("/api/admin/task-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status_updated", title, status: value }),
    }).catch(() => {});

    router.refresh();
  }

  return (
    <div className="max-w-[10rem]">
      <Select value={status} disabled={loading} onChange={(e) => handleChange(e.target.value)}>
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
    </div>
  );
}
