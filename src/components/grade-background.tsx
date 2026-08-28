"use client";

// Ogrenci panelinin arkasinda yasa gore degisen, hafif "canli" (yavas
// hareket eden, bulanik golge/renk lekesi) bir arka plan. Kutuphane
// kullanmiyor - sadece CSS animasyonlu, dusuk opasiteli blur'lu daireler.
// prefers-reduced-motion acikken globals.css'teki kural animasyonu durduruyor.

export type GradeBackgroundVariant = "ilkokul" | "ortaokul" | "lise" | "default";

const PALETTES: Record<GradeBackgroundVariant, { a: string; b: string; c: string }> = {
  // 1-4. sinif: canli, oyuncu renkler
  ilkokul: { a: "bg-amber-300", b: "bg-pink-300", c: "bg-sky-300" },
  // 5-8. sinif: enerjik ama daha dengeli
  ortaokul: { a: "bg-emerald-300", b: "bg-indigo-300", c: "bg-violet-300" },
  // 9-12. sinif: daha sade/ciddi
  lise: { a: "bg-indigo-400", b: "bg-slate-400", c: "bg-blue-400" },
  // sinifi belirtilmemis kullanicilar icin notr varsayilan
  default: { a: "bg-slate-300", b: "bg-indigo-200", c: "bg-slate-200" },
};

const DURATIONS: Record<GradeBackgroundVariant, [string, string, string]> = {
  ilkokul: ["10s", "12s", "9s"],
  ortaokul: ["16s", "18s", "14s"],
  lise: ["22s", "26s", "20s"],
  default: ["24s", "28s", "22s"],
};

export function GradeBackground({ variant }: { variant: GradeBackgroundVariant }) {
  const palette = PALETTES[variant];
  const [dA, dB, dC] = DURATIONS[variant];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={`grade-blob absolute -left-16 -top-16 h-72 w-72 rounded-full opacity-40 blur-3xl ${palette.a}`}
        style={{ animationDuration: dA }}
      />
      <div
        className={`grade-blob absolute -right-10 top-1/3 h-80 w-80 rounded-full opacity-30 blur-3xl ${palette.b}`}
        style={{ animationDuration: dB, animationDirection: "reverse" }}
      />
      <div
        className={`grade-blob absolute -bottom-20 left-1/3 h-64 w-64 rounded-full opacity-30 blur-3xl ${palette.c}`}
        style={{ animationDuration: dC }}
      />
    </div>
  );
}

export function gradeBackgroundVariant(gradeLevel: number | null | undefined): GradeBackgroundVariant {
  if (gradeLevel == null) return "default";
  if (gradeLevel <= 4) return "ilkokul";
  if (gradeLevel <= 8) return "ortaokul";
  return "lise";
}
