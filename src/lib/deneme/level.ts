// Seviye tespit sinavi sonucunu (dogru yuzdesi) bir "seviye" etiketine
// ceviren yardimci fonksiyonlar. level_label degerleri veritabaninda da
// aynen bu sekilde saklanir (profiles.level_label), bu yuzden burasi ile
// migration/route dosyalari her zaman ayni degerleri kullanmali.

export type LevelLabel = "baslangic" | "orta" | "iyi" | "cok_iyi";

export const LEVEL_TITLES: Record<LevelLabel, string> = {
  baslangic: "Başlangıç",
  orta: "Orta",
  iyi: "İyi",
  cok_iyi: "Çok İyi",
};

export const LEVEL_TO_DIFFICULTY: Record<LevelLabel, number> = {
  baslangic: 2,
  orta: 3,
  iyi: 4,
  cok_iyi: 5,
};

export function levelFromScore(pct: number): LevelLabel {
  if (pct >= 85) return "cok_iyi";
  if (pct >= 65) return "iyi";
  if (pct >= 40) return "orta";
  return "baslangic";
}
