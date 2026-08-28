"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Input, Select } from "@/components/ui";

export function SubjectAddForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("ortaokul");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.from("subjects").insert({ name: name.trim(), category });
    setLoading(false);
    if (error) {
      setStatus(`Hata: ${error.message}`);
      return;
    }
    setName("");
    setStatus("Ders eklendi.");
    router.refresh();
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-900">Yeni Ders Ekle</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Ders adı</label>
          <Input placeholder="örn. Kimya" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Kategori</label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="ortaokul">Ortaokul</option>
            <option value="lise">Lise</option>
          </Select>
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Ekleniyor..." : "Dersi Ekle"}</Button>
      </form>
      {status && <p className="mt-2 text-sm text-slate-600">{status}</p>}
    </Card>
  );
}
