"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Input, Badge } from "@/components/ui";

type Course = { id: string; name: string };

export function CourseManager({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.from("courses").insert({ name: name.trim() });
    setLoading(false);
    if (error) {
      setStatus(error.code === "23505" ? "Bu kurs zaten ekli." : `Hata: ${error.message}`);
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-slate-900">Sınıf ve Kurslar</h2>
      <p className="mb-3 text-xs text-slate-500">
        Sınıf düzeyi (1-12) her konuda zaten var; buradan yalnızca sınav hazırlık kurslarını (LGS, TYT, AYT, YKS,
        KPSS, ALES gibi) yönetebilirsin.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {courses.map((c) => (
          <Badge key={c.id}>{c.name}</Badge>
        ))}
        {!courses.length && <p className="text-sm text-slate-400">Henüz kurs eklenmemiş.</p>}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input placeholder="Yeni kurs adı (örn. YDT)" value={name} onChange={(e) => setName(e.target.value)} required />
        <Button type="submit" disabled={loading}>{loading ? "Ekleniyor..." : "Kurs Ekle"}</Button>
      </form>
      {status && <p className="mt-2 text-sm text-slate-600">{status}</p>}
    </Card>
  );
}
