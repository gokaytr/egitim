import { createAdminClient } from "@/lib/supabase/server";
import { DIFFICULTY_LABELS, type QuestionDifficulty } from "@/lib/questions/difficulty";

// Kullanicinin "sinif sinif ayirma, konu konu da ayirma, son verdiklerini
// test olarak 5 tane goster" talebiyle - bu sayfa GECICI OLARAK sinif/ders/
// konu gruplamasi yapmiyor, o sinavin en son eklenen (created_at DESC) 5
// sorusunu duz bir liste halinde gosteriyor. Eskiden burada sinif->ders->
// konu grupla yan mantik vardi; kullanici bu ilk hizli test/onizleme icin
// bunu istemedi. Ileride tekrar tam listeye/gruplu goruntuye donmek
// istenirse bu dosyanin git gecmisinde onceki hali var.
const SHOWN_QUESTION_LIMIT = 5;

// Admin'in "Paylaş" butonuyla ürettiği gizli token linki - giriş
// GEREKTİRMEZ, sadece bu linki bilen görebilir (bkz. exam_shares tablosu,
// planning-board.tsx). Bu sayfa KASITLI OLARAK createAdminClient() (service
// role, RLS bypass) kullanıyor - exam_shares tablosunda hiçbir anon select
// politikası yok, yani token doğrulaması ve soru sorgusu SADECE burada,
// sunucu tarafında yapılabiliyor; anon anahtarla (tarayıcıdan) bu tabloyu
// sorgulamak mümkün değil. Sadece admin onaylı (is_approved=true) ve
// referans havuzu olmayan sorular gösterilir - dışarıya sadece kalite
// kontrolünden geçmiş içerik gitsin diye.
export default async function PaylasimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: share } = await supabase
    .from("exam_shares")
    .select("id, exam_type, label, created_at")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();

  if (!share) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Bu bağlantı geçersiz veya iptal edilmiş</h1>
        <p className="mt-2 text-sm text-slate-500">
          Bağlantıyı sana ileten kişiden yeni bir paylaşım linki istemen gerekebilir.
        </p>
      </main>
    );
  }

  const { data: rawTopics } = await supabase
    .from("topics")
    .select("id, name, grade_level, subject_id, exam_types, subjects(name)")
    .contains("exam_types", [share.exam_type]);

  const topicIds = (rawTopics ?? []).map((t) => t.id);

  const { data: rawQuestions } = topicIds.length
    ? await supabase
        .from("questions")
        .select("id, body, options, correct_option, explanation, difficulty, topic_id, follows_new_policy")
        .in("topic_id", topicIds)
        .eq("is_approved", true)
        .eq("is_reference_only", false)
        .order("created_at", { ascending: false })
        .limit(SHOWN_QUESTION_LIMIT)
    : { data: [] };

  const questions = rawQuestions ?? [];
  const totalQuestions = questions.length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">Paylaşılan Sınav</p>
        <h1 className="text-2xl font-bold text-slate-900">{share.exam_type}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Son eklenen {totalQuestions} soru (deneme/test önizlemesi) — bu sayfa Odak yönetici paneli tarafından senin
          için paylaşıldı. Kimseyle paylaşma.
        </p>
      </div>

      {totalQuestions === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          Bu sınavda henüz onaylanmış (yayınlanmaya hazır) bir soru yok.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-900">
              {i + 1}. {q.follows_new_policy && <span className="mr-1 text-amber-600">*</span>}
              {q.body}
            </p>
            <ul className="mt-2 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
              {Object.entries((q.options ?? {}) as Record<string, string>).map(([key, val]) => {
                const isCorrect = key === q.correct_option;
                return (
                  <li
                    key={key}
                    className={`rounded-lg border px-2.5 py-1.5 ${
                      isCorrect
                        ? "border-emerald-400 bg-emerald-50 font-semibold text-emerald-800"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {key}) {val}
                    {isCorrect && " ✓"}
                  </li>
                );
              })}
            </ul>
            {q.explanation && (
              <div className="mt-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">Açıklama</p>
                <p>{q.explanation}</p>
              </div>
            )}
            {q.difficulty && (
              <p className="mt-1 text-xs text-slate-400">Zorluk: {DIFFICULTY_LABELS[q.difficulty as QuestionDifficulty]}</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
