// Soru zorlugu artik 1-5 sayisal bir olcek degil, 4 kademeli isimlendirilmis
// bir olcek (kolay/orta/zor/cok_zor). Bu dosya, veritabanindaki
// question_difficulty enum'uyla BIREBIR ayni degerleri tasir - herhangi bir
// yerde bu listeyi degistirirsen ilgili migration'i da guncellemen gerekir.
//
// Zorluk seviyesi SADECE admin ve ogretmene gosterilir (Soru Onayi / Tum
// Sorular ekranlarindaki rozetler) - ogrenci tarafinda hicbir ekranda
// gorunmez, bu kasitli bir tasarim karari.
export type QuestionDifficulty = "kolay" | "orta" | "zor" | "cok_zor";

export const DIFFICULTY_ORDER: QuestionDifficulty[] = ["kolay", "orta", "zor", "cok_zor"];

export const DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  kolay: "Kolay",
  orta: "Orta",
  zor: "Zor",
  cok_zor: "Çok Zor",
};

// Deneme montajinda ("sana ozel" mod) ogrencinin seviyesine en yakin
// zorluktaki sorulari secebilmek icin siralanabilir bir dereceye ihtiyac var
// - bkz. lib/deneme/assemble.ts.
export const DIFFICULTY_RANK: Record<QuestionDifficulty, number> = {
  kolay: 1,
  orta: 2,
  zor: 3,
  cok_zor: 4,
};

export function isQuestionDifficulty(value: unknown): value is QuestionDifficulty {
  return typeof value === "string" && (DIFFICULTY_ORDER as string[]).includes(value);
}
