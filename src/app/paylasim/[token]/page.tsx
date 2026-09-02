import { createAdminClient } from "@/lib/supabase/server";
import { DIFFICULTY_LABELS, type QuestionDifficulty } from "@/lib/questions/difficulty";

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

function gradeLabel(g: number | null): string {
  return g == null ? "Genel" : `${g}. Sınıf`;
}

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
        .order("created_at", { ascending: true })
    : { data: [] };

  const topicById = new Map((rawTopics ?? []).map((t) => [t.id, t]));

  // sinif -> ders -> konu -> sorular seklinde grupla
  type Grouped = Map<string, Map<string, Map<string, typeof rawQuestions>>>;
  const grouped: Grouped = new Map();
  (rawQuestions ?? []).forEach((q) => {
    const topic = topicById.get(q.topic_id);
    if (!topic) return;
    const gradeKey = gradeLabel(topic.grade_level);
    const subjectName = firstOf(topic.subjects)?.name ?? "Diğer";
    const byDers = grouped.get(gradeKey) ?? new Map();
    const byKonu = byDers.get(subjectName) ?? new Map();
    const list = byKonu.get(topic.name) ?? [];
    list.push(q);
    byKonu.set(topic.name, list);
    byDers.set(subjectName, byKonu);
    grouped.set(gradeKey, byDers);
  });

  const totalQuestions = rawQuestions?.length ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">Paylaşılan Sınav</p>
        <h1 className="text-2xl font-bold text-slate-900">{share.exam_type}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {totalQuestions} soru — bu sayfa Odak yönetici paneli tarafından senin için paylaşıldı. Kimseyle paylaşma.
        </p>
      </div>

      {totalQuestions === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
          Bu sınavda henüz onaylanmış (yayınlanmaya hazır) bir soru yok.
        </p>
      )}

      <div className="flex flex-col gap-8">
        {Array.from(grouped.entries()).map(([gradeKey, byDers]) => (
          <section key={gradeKey}>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">{gradeKey}</h2>
            <div className="flex flex-col gap-6">
              {Array.from(byDers.entries()).map(([subjectName, byKonu]) => (
                <div key={subjectName}>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-600">{subjectName}</h3>
                  <div className="flex flex-col gap-4">
                    {Array.from(byKonu.entries()).map(([topicName, qs]) => (
                      <div key={topicName} className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="mb-3 text-sm font-semibold text-slate-800">
                          {topicName} <span className="font-normal text-slate-400">({qs?.length ?? 0} soru)</span>
                        </p>
                        <div className="flex flex-col gap-4">
                          {(qs ?? []).map((q) => (
                            <div key={q.id} className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
                              <p className="font-medium text-slate-900">
                                {q.follows_new_policy && <span className="mr-1 text-amber-600">*</span>}
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
                                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">
                                    Açıklama
                                  </p>
                                  <p>{q.explanation}</p>
                                </div>
                              )}
                              {q.difficulty && (
                                <p className="mt-1 text-xs text-slate-400">Zorluk: {DIFFICULTY_LABELS[q.difficulty as QuestionDifficulty]}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
