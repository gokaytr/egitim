"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ASSIGNABLE_ROLES = [
  { value: "student", label: "Öğrenci" },
  { value: "parent", label: "Veli" },
  { value: "teacher", label: "Öğretmen" },
  { value: "moderator", label: "Moderatör" },
];

// Admin rolu buradan degistirilemiyor (yanlislikla kendini/baskasini admin
// yapma ya da admin'i dusurme riskini onlemek icin) - admin atamasi
// "Admin İzin Listesi" uzerinden yonetiliyor.
export function RoleSelect({ userId, currentRole }: { userId: string; currentRole: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentRole === "admin") {
    return <span className="text-xs text-slate-400">Admin izin listesinden yönetilir</span>;
  }

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: newRole, teacher_pending: false })
      .eq("id", userId);
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <select
        defaultValue={currentRole}
        onChange={handleChange}
        disabled={loading}
        className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-indigo-500 disabled:opacity-50"
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
