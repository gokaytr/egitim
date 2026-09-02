"use client";

import { ReactNode, useEffect, useState } from "react";

type Tab = {
  key: string;
  label: string;
  content: ReactNode;
  dot?: boolean;
  // Sekmeyi (orn. "Soru Ekle"/"Soru Onayı") diger sekmelerden ayirt etmek
  // icin secili haldeyken belirgin bir renk vermek amacli.
  tone?: "indigo" | "amber" | "emerald";
};

const ACTIVE_TONE_CLASSES: Record<NonNullable<Tab["tone"]>, string> = {
  indigo: "bg-indigo-600 text-white shadow-sm",
  amber: "bg-amber-500 text-white shadow-sm",
  emerald: "bg-emerald-600 text-white shadow-sm",
};

// Genel amacli, sunucu tarafinda hazirlanmis icerikleri (ReactNode) sekmeler
// arasinda gosterip gizleyen kucuk bir sarmalayici. Veri cekme her zaman
// cagiran sunucu bileseninde yapilir, bu bilesen sadece gorunurlugu yonetir.
// `dot` verilen bir sekme (orn. onay bekleyen isi olan "Soru Onayi") kucuk
// turuncu bir isikla vurgulanir. `tone` verilen bir sekme secili oldugunda
// notr beyaz yerine belirgin bir renkle (orn. Soru Ekle -> indigo, Soru
// Onayi -> amber) vurgulanir.
export function SimpleTabs({
  tabs,
  defaultKey,
  syncQueryParam,
}: {
  tabs: Tab[];
  defaultKey?: string;
  // Verilirse, aktif sekme bu URL query param'inda ("?<syncQueryParam>=<key>")
  // saklanir/okunur - boylece baska bir sayfadan (orn. Genel Bakis'taki "Soru
  // Ekle"/"Soru Onayla" kartlari) dogrudan istenen sekmeye link verilebilir.
  // Hydration uyumsuzlugu olmasin diye ilk render'da her zaman defaultKey
  // kullanilir, URL'deki deger sadece mount sonrasi bir useEffect ile okunur.
  syncQueryParam?: string;
}) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key);

  useEffect(() => {
    if (!syncQueryParam) return;
    const fromUrl = new URLSearchParams(window.location.search).get(syncQueryParam);
    if (fromUrl && tabs.some((t) => t.key === fromUrl)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL, React disinda bir kaynak; mount sonrasi tek seferlik senkronizasyon.
      setActive(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncQueryParam]);

  function selectTab(key: string) {
    setActive(key);
    if (syncQueryParam) {
      const url = new URL(window.location.href);
      url.searchParams.set(syncQueryParam, key);
      window.history.replaceState(null, "", url);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => selectTab(t.key)}
            className={`flex touch-manipulation items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active === t.key
                ? (t.tone && ACTIVE_TONE_CLASSES[t.tone]) || "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.dot && (
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${active === t.key ? "bg-white" : "bg-amber-500"}`}
                aria-label="Onay bekleyen soru var"
              />
            )}
          </button>
        ))}
      </div>
      {tabs.find((t) => t.key === active)?.content}
    </div>
  );
}
