// Soru zorlugu artik 1-5 sayisal bir olcek degil, 4 kademeli isimlendirilmis
// bir olcek (kolay/orta/zor/olimpiyat). Bu dosya, veritabanindaki
// question_difficulty enum'uyla BIREBIR ayni degerleri tasir - herhangi bir
// yerde bu listeyi degistirirsen ilgili migration'i da guncellemen gerekir.
// 4. kademe kullanicinin talebiyle "cok_zor" -> "olimpiyat" olarak yeniden
// adlandirildi (bkz. migrations/0031) - ÖSYM'nin de otesinde, olimpiyat
// tarzi ozgun/yaratici akil yurutme gerektiren, en ust duzey sorular icin.
//
// Zorluk seviyesi SADECE admin ve ogretmene gosterilir (Soru Onayi / Tum
// Sorular ekranlarindaki rozetler) - ogrenci tarafinda hicbir ekranda
// gorunmez, bu kasitli bir tasarim karari.
export type QuestionDifficulty = "kolay" | "orta" | "zor" | "olimpiyat";

export const DIFFICULTY_ORDER: QuestionDifficulty[] = ["kolay", "orta", "zor", "olimpiyat"];

export const DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  kolay: "Kolay",
  orta: "Orta",
  zor: "Zor",
  olimpiyat: "Olimpiyat",
};

// Deneme montajinda ("sana ozel" mod) ogrencinin seviyesine en yakin
// zorluktaki sorulari secebilmek icin siralanabilir bir dereceye ihtiyac var
// - bkz. lib/deneme/assemble.ts. NOT: "cok iyi" seviyesindeki bir ogrenciye
// otomatik montajda hala "zor" (3) atanir, "olimpiyat" (4) degil - bkz.
// lib/deneme/level.ts'teki not: olimpiyat kademesi normal/otomatik montaja
// degil, ozel olarak secilecek/uretilecek icerige ayrildi.
export const DIFFICULTY_RANK: Record<QuestionDifficulty, number> = {
  kolay: 1,
  orta: 2,
  zor: 3,
  olimpiyat: 4,
};

export function isQuestionDifficulty(value: unknown): value is QuestionDifficulty {
  return typeof value === "string" && (DIFFICULTY_ORDER as string[]).includes(value);
}
