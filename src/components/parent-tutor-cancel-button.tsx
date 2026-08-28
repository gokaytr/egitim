"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ParentTutorCancelButton({ referralId }: { referralId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("tutor_referrals").update({ status: "cancelled" }).eq("id", referralId);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="text-xs font-medium text-red-600 underline hover:text-red-700 disabled:opacity-50"
    >
      {loading ? "Vazgeçiliyor..." : "Vazgeç"}
    </button>
  );
}
