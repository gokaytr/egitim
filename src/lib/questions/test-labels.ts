// test_number'a gore soru gruplarinin iki dilli (TR/EN) etiketleri - bkz.
// migration 0033. Bu dosya ogrenci, ogretmen, veli ve admin panellerinin
// HEPSI tarafindan ortak kullanilsin diye tek bir yerde tutuluyor (bkz.
// CLAUDE.md "Admin onizleme paritesi kurali" - ayni etiket her yerde ayni
// gorunmeli). 1/2/3 onceden sadece ogrenci sayfasinda (TEST_LABELS sabiti
// olarak) tanimliydi; 4/5 İngilizce derste eklenen yeni "temel kelime" ve
// "paragraf" test gruplari icin bu oturumda eklendi.
export const TEST_LABELS: Record<number, string> = {
  1: "Test 1 · Kolay / Easy",
  2: "Test 2 · Orta / Medium",
  3: "Test 3 · Zor / Hard",
  4: "Test 4 · Temel Kelimeler / Basic Words",
  5: "Test 5 · Paragraf / Paragraph",
};

export function getTestLabel(testNumber: number): string {
  return TEST_LABELS[testNumber] ?? `Test ${testNumber}`;
}
