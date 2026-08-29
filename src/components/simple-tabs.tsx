"use client";

import { ReactNode, useState } from "react";

type Tab = { key: string; label: string; content: ReactNode; dot?: boolean };

// Genel amacli, sunucu tarafinda hazirlanmis icerikleri (ReactNode) sekmeler
// arasinda gosterip gizleyen kucuk bir sarmalayici. Veri cekme her zaman
// cagiran sunucu bileseninde yapilir, bu bilesen sadece gorunurlugu yonetir.
// `dot` verilen bir sekme (orn. onay bekleyen isi olan "Soru Onayi") kucuk
// turuncu bir isikla vurgulanir.
export function SimpleTabs({ tabs, defaultKey }: { tabs: Tab[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`flex touch-manipulation items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active === t.key ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.dot && <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-label="Onay bekleyen soru var" />}
          </button>
        ))}
      </div>
      {tabs.find((t) => t.key === active)?.content}
    </div>
  );
}
