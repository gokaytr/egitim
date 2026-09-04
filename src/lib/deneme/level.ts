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
//
// NOT: "cok_iyi" (yuzde 85+ dogru) seviyesindeki bir ogrenciye burada hala
// "zor" (3. kademe) atanir, "olimpiyat" (4. kademe) DEGIL. Kullanicinin "4.
// kademe olimpiyat sorusu" talebiyle bu kademe eklendi ama olimpiyat, sinav
// hazirligindaki NORMAL en-iyi ogrenci grubu icin degil, ozel/istisnai bir
// ust seviye - "cok iyi" seviye-tespit sonucu alan her ogrenciye otomatik
// olimpiyat sorusu cikarmak onlari haksiz yere zorlardi. Olimpiyat kademesi
// bu otomatik montaja dahil edilmez; ogretmen/admin onu bilerek ayri
// filtreleyebilir/uretebilir (bkz. lib/questions/difficulty.ts).
export const LEVEL_TO_DIFFICULTY: Record<LevelLabel, QuestionDifficulty> = {
  baslangic: "kolay",
  orta: "orta",
  iyi: "zor",
  cok_iyi: "zor",
};

export function levelFromScore(pct: number): LevelLabel {
  if (pct >= 85) return "cok_iyi";
  if (pct >= 65) return "iyi";
  if (pct >= 40) return "orta";
  return "baslangic";
}
