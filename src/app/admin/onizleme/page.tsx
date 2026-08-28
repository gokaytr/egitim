"use client";

import { useState } from "react";

const TABS = [
  { key: "ogrenci", label: "Üye Ekranı", href: "/ogrenci" },
  { key: "ogretmen", label: "Öğretmen Ekranı", href: "/ogretmen" },
  { key: "veli", label: "Veli Görünümü", href: "/ogrenci/rapor" },
] as const;

export default function OnizlemePage() {
  const [active, setActive] = useState<(typeof TABS)[number]["key"]>("ogrenci");
  const activeTab = TABS.find((t) => t.key === active)!;

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Önizleme</h1>
        <p className="text-sm text-slate-500">
          Öğrenci, öğretmen ve veli ekranlarını ayrı bir hesapla giriş yapmadan buradan önizleyebilirsin.
        </p>
      </div>

      <div className="flex w-full max-w-lg gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
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

      <div className="min-h-[70vh] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <iframe key={activeTab.key} src={activeTab.href} title={activeTab.label} className="h-[80vh] w-full" />
      </div>
    </div>
  );
}
