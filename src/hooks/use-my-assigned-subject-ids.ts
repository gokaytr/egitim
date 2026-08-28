"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Giris yapmis ogretmenin admin tarafindan atandigi branslarin subject id'lerini
// dondurur. Hicbir brans atanmamissa bos dizi doner (cagiran taraf bunu "hepsini
// goster" olarak yorumlamali, boylece henuz atanmamis ogretmenler icin kisitlama
// olmaz).
export function useMyAssignedSubjectIds(): string[] {
  const [subjectIds, setSubjectIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase.from("teacher_subjects").select("subject_id").eq("teacher_id", userData.user.id);
      if (!cancelled) setSubjectIds((data ?? []).map((r) => r.subject_id));
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return subjectIds;
}
