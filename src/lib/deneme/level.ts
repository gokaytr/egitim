// Seviye tespit sinavi sonucunu (dogru yuzdesi) bir "seviye" etiketine
// ceviren yardimci fonksiyonlar. level_label degerleri veritabaninda da
// aynen bu sekilde saklanir (profiles.level_label), bu yuzden burasi ile
// migration/route dosyalari her zaman ayni degerleri kullanmali.

import type { QuestionDifficulty } from "@/lib/questions/difficulty";

export type LevelLabel = "baslangic" | "orta" | "iyi" | "cok_iyi";

export const LEVEL_TITLES: Record<LevelLabel, string> = {
  baslangic: "Başlangıç",
  orta: "Orta",
  iyi: "İyi",
  cok_iyi: "Çok İyi",
};

// "Sana ozel" deneme montaji, ogrencinin seviye-tespit sonucuna (level_label)
// en yakin zorluktaki sorulari secer - bkz. lib/deneme/assemble.ts.
export const LEVEL_TO_DIFFICULTY: Record<LevelLabel, QuestionDifficulty> = {
  baslangic: "kolay",
  orta: "orta",
  iyi: "zor",
  cok_iyi: "cok_zor",
};

export function levelFromScore(pct: number): LevelLabel {
  if (pct >= 85) return "cok_iyi";
  if (pct >= 65) return "iyi";
  if (pct >= 40) return "orta";
  return "baslangic";
}
