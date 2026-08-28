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

export function AdminTaskStatusSelect({ taskId, status }: { taskId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(value: string) {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("admin_tasks").update({ status: value, updated_at: new Date().toISOString() }).eq("id", taskId);
    setLoading(false);
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
