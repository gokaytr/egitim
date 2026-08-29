"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui";

type Candidate = { id: string; full_name: string };

// Admin/ogretmen "Ogrenci Raporlari" ekraninda kullanilan, tek tek secip
// gecmek yerine arayip listede kaydirarak goz atilabilen ogrenci secici.
// Cok sayida ogrenci oldugunda tek bir uzun dropdown yerine bu daha
// kullanisli - arama kutusuna yazdikca liste daralir, liste kendi icinde
// kayar (sayfa uzamaz).
export function StudentReportSearchList({ candidates, currentId }: { candidates: Candidate[]; currentId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");

  if (candidates.length <= 1) return null;

  const filtered = query.trim()
    ? candidates.filter((c) => c.full_name.toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr")))
    : candidates;

  function handlePick(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("studentId", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Card className="max-w-sm p-3">
      <div className="relative mb-2">
        <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Öğrenci ara..."
          className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
        {filtered.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => handlePick(c.id)}
            className={`touch-manipulation rounded-lg px-3 py-2 text-left text-sm transition ${
              c.id === currentId ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            {c.full_name}
          </button>
        ))}
        {!filtered.length && <p className="px-3 py-2 text-sm text-slate-400">Eşleşen öğrenci yok.</p>}
      </div>
    </Card>
  );
}
