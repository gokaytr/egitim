"use client";

import { useState, type ReactNode } from "react";

export function ReportTabs({
  overview,
  daily,
  general,
}: {
  overview: ReactNode;
  daily: ReactNode;
  general: ReactNode;
}) {
  const [active, setActive] = useState<"overview" | "daily" | "general">("overview");

  const tabs: { key: typeof active; label: string }[] = [
    { key: "overview", label: "Genel Bakış" },
    { key: "daily", label: "Günlük Aktivite" },
    { key: "general", label: "Genel Raporlama" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active === t.key ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={active === "overview" ? "flex flex-col gap-6" : "hidden"}>{overview}</div>
      <div className={active === "daily" ? "flex flex-col gap-6" : "hidden"}>{daily}</div>
      <div className={active === "general" ? "flex flex-col gap-6" : "hidden"}>{general}</div>
    </div>
  );
}
