"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Ogrencinin "Son Analiz" karti icin okundu-anladi onayi. Onaylandiginda
// veli tarafinda da (rapor ekranlarinda) okundu/okunmadi olarak gorunur.
export function DiagnosisAcknowledgeButton({
  diagnosisId,
  acknowledgedAt,
}: {
  diagnosisId: string;
  acknowledgedAt: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (acknowledgedAt) {
    return (
      <p className="mt-3 text-left text-xs font-medium text-green-700">
        ✓ Okudum, anladım — {new Date(acknowledgedAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
      </p>
    );
  }

  async function onClick() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("diagnoses")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", diagnosisId);
    setPending(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? "Kaydediliyor..." : "Okudum, Anladım"}
      </button>
      {error && <p className="text-xs text-red-600">Hata: {error}</p>}
    </div>
  );
}
