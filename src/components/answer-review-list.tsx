import { Card, Badge } from "@/components/ui";

export type ReviewQuestion = {
  id: string;
  body: string;
  options: Record<string, string>;
  correct_option: string;
  explanation?: string | null;
};

// Deneme/konu testi bittikten sonra "Yanlışlarımı incele" ile acilan, soru
// soru dogru cevap + aciklama ozeti. Aciklama SADECE yanlis/bos sorularda
// degil, dogru cevaplanan sorularda da aynen gosterilir - boylece ogrenci
// dogru yaptigi sorunun mantigini da pekistirir (bkz. CLAUDE.md "Soru cevap
// aciklamasi kurali"). Sadece rozet/renk vurgusu dogru/yanlis/bos'a gore
// degisir, aciklama kutusu her zaman ayni bicimde gorunur - ancak metnin
// basligi dogru cevaplanan sorularda "Dogru bilmissin!" olarak degisir.
export function AnswerReviewList({
  questions,
  answers,
}: {
  questions: ReviewQuestion[];
  answers: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-slate-900">Soru Soru İnceleme</h3>
      {questions.map((q, i) => {
        const selected = answers[q.id];
        const isCorrect = selected === q.correct_option;
        const isEmpty = !selected;
        return (
          <Card key={q.id} className={isCorrect ? "" : "border-amber-200 bg-amber-50/40"}>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              {isCorrect ? (
                <Badge tone="green">Doğru</Badge>
              ) : isEmpty ? (
                <Badge tone="amber">Boş bıraktın</Badge>
              ) : (
                <Badge tone="red">Yanlış</Badge>
              )}
            </div>
            <p className="font-medium text-slate-900">
              {i + 1}. {q.body}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {Object.entries(q.options ?? {}).map(([key, val]) => {
                const isThisCorrect = key === q.correct_option;
                const isThisSelected = key === selected;
                return (
                  <li
                    key={key}
                    className={`rounded-lg border px-3 py-1.5 ${
                      isThisCorrect
                        ? "border-emerald-400 bg-emerald-50 font-semibold text-emerald-800"
                        : isThisSelected
                          ? "border-red-300 bg-red-50 text-red-700"
                          : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {key}) {val}
                    {isThisCorrect && " ✓"}
                    {isThisSelected && !isThisCorrect && " ✗ (senin cevabın)"}
                  </li>
                );
              })}
            </ul>
            {q.explanation && (
              <div className={`mt-3 rounded-lg p-3 text-sm ${isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-indigo-50 text-indigo-900"}`}>
                <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${isCorrect ? "text-emerald-600" : "text-indigo-500"}`}>
                  {isCorrect ? "Doğru bilmişsin!" : "Cevap böyle olmalıydı"}
                </p>
                <p>{q.explanation}</p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
