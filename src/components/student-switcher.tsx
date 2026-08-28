"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui";

type Candidate = { id: string; full_name: string };

export function StudentSwitcher({ candidates, currentId, label }: { candidates: Candidate[]; currentId: string; label: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (candidates.length <= 1) return null;

  function handleChange(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("studentId", id);
    router.push(`/ogrenci/rapor?${params.toString()}`);
  }

  return (
    <div className="max-w-xs">
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <Select value={currentId} onChange={(e) => handleChange(e.target.value)}>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>{c.full_name}</option>
        ))}
      </Select>
    </div>
  );
}
