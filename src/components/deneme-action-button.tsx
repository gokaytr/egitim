"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import type { DenemeMode } from "@/lib/deneme/assemble";

export function DenemeActionButton({
  mode,
  label,
  variant = "primary",
}: {
  mode: DenemeMode;
  label: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/deneme/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "Bir şeyler ters gitti, tekrar dener misin?");
        setLoading(false);
        return;
      }
      router.push(`/ogrenci/deneme/${json.examId}`);
    } catch {
      setError("Bağlantı sorunu oldu, tekrar dener misin?");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button variant={variant} onClick={handleClick} disabled={loading} className="touch-manipulation">
        {loading ? "Hazırlanıyor..." : label}
      </Button>
      {error && <p className="mt-1.5 max-w-xs text-xs text-amber-600">{error}</p>}
    </div>
  );
}
