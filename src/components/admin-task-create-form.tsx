"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Textarea } from "@/components/ui";

export function AdminTaskCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Başlık gerekli.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("admin_tasks").insert({
      title: title.trim(),
      description: description.trim() || null,
      status: "pending",
      created_by: userData.user?.id,
    });

    setLoading(false);
    if (insertError) {
      setError(`Hata: ${insertError.message}`);
      return;
    }
    setTitle("");
    setDescription("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Başlık</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Kasım ayı veli toplantısı organizasyonu" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Açıklama (opsiyonel)</label>
        <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detaylar, notlar..." />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="self-start">
        {loading ? "Ekleniyor..." : "Yapılacak Ekle"}
      </Button>
    </form>
  );
}
