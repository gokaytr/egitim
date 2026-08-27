"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card } from "@/components/ui";

// Bu listeye eklenen e-postalar kayit olurken (veya Google ile ilk girdiklerinde)
// otomatik olarak admin rolu alir. Var olan bir kullaniciyi admin yapmak icin
// hala "Kullanicilar" tablosundan rolunu elle guncellemek gerekir - bu liste
// sadece YENI kayitlari etkiler.
export function AdminAllowlistForm({ emails }: { emails: string[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("admin_allowlist")
      .insert({ email: email.trim().toLowerCase() });
    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setEmail("");
    router.refresh();
  }

  async function handleRemove(target: string) {
    const supabase = createClient();
    await supabase.from("admin_allowlist").delete().eq("email", target);
    router.refresh();
  }

  return (
    <Card>
      <h2 className="font-semibold text-slate-900">Admin İzin Listesi</h2>
      <p className="mt-1 text-sm text-slate-500">
        Buraya eklenen e-postalar kayıt olduklarında (veya Google ile ilk girdiklerinde)
        otomatik olarak admin rolüyle açılır.
      </p>
      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <Input
          type="email"
          required
          placeholder="ornek@eposta.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          Ekle
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <ul className="mt-4 flex flex-col gap-1">
        {emails.map((e) => (
          <li key={e} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-700">{e}</span>
            <button
              type="button"
              onClick={() => handleRemove(e)}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Kaldır
            </button>
          </li>
        ))}
        {!emails.length && <li className="text-sm text-slate-400">Liste boş.</li>}
      </ul>
    </Card>
  );
}
