"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Öğrenci bir konu anlatımını gördüğünde sessizce bir izleme kaydı düşer.
// Bu kayıt veli raporundaki "kaç konu anlatımı izledi" sayısının gerçek
// veriye dayanmasını sağlıyor.
export function LessonContentView({ contentId }: { contentId: string }) {
  const loggedRef = useRef(false);

  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase.from("lesson_content_views").insert({ student_id: data.user.id, content_id: contentId }).then();
    });
  }, [contentId]);

  return null;
}
