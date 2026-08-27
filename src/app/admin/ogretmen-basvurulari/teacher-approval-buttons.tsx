"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export function TeacherApprovalButtons({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(approve: boolean) {
    setLoading(true);
    const supabase = createClient();
    if (approve) {
      await supabase
        .from("profiles")
        .update({ role: "teacher", teacher_pending: false })
        .eq("id", profileId);
    } else {
      await supabase
        .from("profiles")
        .update({ teacher_pending: false })
        .eq("id", profileId);
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button disabled={loading} onClick={() => act(true)}>
        Onayla
      </Button>
      <Button disabled={loading} variant="danger" onClick={() => act(false)}>
        Reddet
      </Button>
    </div>
  );
}
