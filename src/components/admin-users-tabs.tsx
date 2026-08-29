"use client";

import { ReactNode, useState } from "react";

type TabKey = "users" | "veli" | "ogretmen-ogrenci";

const TABS: { key: TabKey; label: string }[] = [
  { key: "users", label: "Kullanıcılar" },
  { key: "veli", label: "Veli Bağlantıları" },
  { key: "ogretmen-ogrenci", label: "Öğretmen-Öğrenci Bağlantıları" },
];

// Kullanicilar sayfasindaki 3 sekme. Veri cekme sunucu tarafinda
// (kullanicilar/page.tsx) yapiliyor, bu bileşen sadece hazir render
// edilmis icerikleri (ReactNode) sekmeler arasinda gosterip gizliyor.
export function AdminUsersTabs({
  usersTab,
  veliTab,
  ogretmenOgrenciTab,
}: {
  usersTab: ReactNode;
  veliTab: ReactNode;
  ogretmenOgrenciTab: ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>("users");

  const content: Record<TabKey, ReactNode> = {
    users: usersTab,
    veli: veliTab,
    "ogretmen-ogrenci": ogretmenOgrenciTab,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`touch-manipulation rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.key ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {content[tab]}
    </div>
  );
}
