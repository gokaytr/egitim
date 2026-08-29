"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";

type StudentRow = { id: string; full_name: string; grade_level: number | null; exam_target: string | null };

// Admin "Ogrenci Raporlari" ekraninin liste gorunumu - Kullanicilar
// sekmesindeki gibi basit, aranabilir, kaydirilabilir bir liste. Binlerce
// ogrenci olsa bile tek tek rapor cekmeden sadece isim/sinif/hedef
// gosteriyor; bir satira tiklaninca o ogrencinin tam raporuna geciliyor.
export function AdminStudentReportList({ students }: { students: StudentRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? students.filter((s) => s.full_name.toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr")))
    : students;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-100 p-4">
        <div className="relative">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Öğrenci ara..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">{filtered.length} öğrenci</p>
      </div>
      <div className="max-h-[65vh] overflow-y-auto">
        {filtered.map((s) => (
          <Link
            key={s.id}
            href={`/admin/ogrenci-raporlari?studentId=${s.id}`}
            className="flex items-center justify-between gap-3 border-b border-slate-50 px-5 py-3 text-sm transition last:border-0 hover:bg-slate-50"
          >
            <span className="font-medium text-slate-900">{s.full_name}</span>
            <span className="text-xs text-slate-500">
              {s.grade_level ? `${s.grade_level}. sınıf` : "sınıf yok"}
              {s.exam_target ? ` · ${s.exam_target}` : ""}
            </span>
          </Link>
        ))}
        {!filtered.length && <p className="px-5 py-4 text-sm text-slate-400">Eşleşen öğrenci yok.</p>}
      </div>
    </Card>
  );
}
