"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export function ApproveButton({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(approve: boolean) {
    setLoading(true);
    const supabase = createClient();
    if (approve) {
      // Onaylayan kullanicinin kimligini kaydediyoruz - ogretmen aktivite
      // raporunda "onayladigi soru" sayisi buradan hesaplaniyor.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase
        .from("questions")
        .update({ is_approved: true, approved_by: user?.id ?? null, approved_at: new Date().toISOString() })
        .eq("id", questionId);
    } else {
      await supabase.from("questions").delete().eq("id", questionId);
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mt-4 flex gap-2">
      <Button disabled={loading} onClick={() => act(true)}>
        Onayla
      </Button>
      <Button disabled={loading} variant="danger" onClick={() => act(false)}>
        Reddet
      </Button>
    </div>
  );
}