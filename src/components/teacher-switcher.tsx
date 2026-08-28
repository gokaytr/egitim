"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui";

type Candidate = { id: string; full_name: string };

export function TeacherSwitcher({ candidates, currentId }: { candidates: Candidate[]; currentId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (candidates.length <= 1) return null;

  function handleChange(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("teacherId", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="max-w-xs">
      <label className="mb-1 block text-sm font-medium text-slate-700">Öğretmen seç</label>
      <Select value={currentId ?? ""} onChange={(e) => handleChange(e.target.value)}>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>{c.full_name}</option>
        ))}
      </Select>
    </div>
  );
}
