"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteLinkButton({ parentId, studentId }: { parentId: string; studentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("parent_student_links").delete().eq("parent_id", parentId).eq("student_id", studentId);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      Kaldır
    </button>
  );
}
