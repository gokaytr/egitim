"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui";

type Candidate = { id: string; full_name: string; grade_level: number | null };

export function StudentPreviewSwitcher({ candidates, currentId }: { candidates: Candidate[]; currentId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (candidates.length === 0) return null;

  function handleChange(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("studentId", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="max-w-xs">
      <label className="mb-1 block text-sm font-medium text-slate-700">Test öğrenci seç (sınıf sınıf)</label>
      <Select value={currentId ?? ""} onChange={(e) => handleChange(e.target.value)}>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.grade_level}. sınıf — {c.full_name}
          </option>
        ))}
      </Select>
    </div>
  );
}
