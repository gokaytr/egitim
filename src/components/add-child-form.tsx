"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";

export function AddChildForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await fetch("/api/parent/add-child", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(json?.error ?? "Öğrenci eklenemedi.");
      return;
    }

    setSuccess(`${json.student?.full_name ?? "Öğrenci"} hesabına bağlandı.`);
    setEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700">Öğrencinin e-posta adresi</label>
        <Input type="email" required placeholder="ogrenci@ornek.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Ekleniyor..." : "Öğrenci Ekle"}
      </Button>
      {error && <p className="text-sm text-red-600 sm:ml-3">{error}</p>}
      {success && <p className="text-sm text-emerald-600 sm:ml-3">{success}</p>}
    </form>
  );
}
