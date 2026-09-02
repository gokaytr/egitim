"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

// Bir soruyu "Referans Havuzu"na tasiyan/oradan geri cikaran kucuk buton -
// ApproveButton ile ayni desen. Referans Havuzu'na tasinan bir soru
// is_reference_only=true olur ve ogrenciye hicbir akiste (konu testi, cevap
// anahtari, deneme/seviye tespit) bir daha gosterilmez - bkz. migration
// 0024_soru_referans_havuzu.sql.
export function ReferencePoolToggleButton({
  questionId,
  isReferenceOnly,
}: {
  questionId: string;
  isReferenceOnly: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("questions").update({ is_reference_only: !isReferenceOnly }).eq("id", questionId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mt-3">
      <Button variant="secondary" disabled={loading} onClick={toggle} className="text-xs">
        {isReferenceOnly ? "↩ Referans Havuzundan Çıkar (yayına al)" : "🔒 Referans Havuzuna Taşı (öğrenciye gösterme)"}
      </Button>
    </div>
  );
}
