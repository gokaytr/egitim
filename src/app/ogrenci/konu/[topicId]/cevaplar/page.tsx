import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";

// Ogrenci, konu testini cozmeden de o konudaki onayli sorularin cevap
// anahtarina buradan bakabilir - "Biliyorum, test et" / "Bilmiyorum,
// programa ekle" secenekleriyle ayni ders sayfasindaki "Cevaplar"
// butonundan acilir. Salt okunur bir liste; puanlama/kayit yapmaz.
export default async function KonuCevaplarPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const supabase = await createClient();

  const [{ data: topic }, { data: questions }] = await Promise.all([
    supabase.from("topics").select("id, name").eq("id", topicId).single(),
    supabase
      .from("questions")
      .select("id, body, options, correct_option, explanation, image_url")
      .eq("topic_id", topicId)
      .order("created_at"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/ogrenci/konu/${topicId}`} className="text-sm text-indigo-600">
          ← Konuya dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{topic?.name} · Cevap Anahtarı</h1>
        <p className="text-sm text-slate-500">Bu konudaki soruların doğru cevapları aşağıda listelenmiştir.</p>
      </div>

      {!questions?.length ? (
        <Card>
          <p className="text-sm text-slate-600">Bu konuda henüz soru yok.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {questions.map((q, i) => (
            <Card key={q.id}>
              <p className="font-medium text-slate-900">
                {i + 1}. {q.body}
              </p>
              {q.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={q.image_url} alt="Soru görseli" className="mt-2 max-w-full rounded-lg border border-slate-200" />
              )}
              <div className="mt-3 flex flex-col gap-2">
                {Object.entries(q.options as Record<string, string>).map(([key, val]) => {
                  const isCorrect = key === q.correct_option;
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        isCorrect ? "border-emerald-400 bg-emerald-50 font-semibold text-emerald-800" : "border-slate-200 text-slate-700"
                      }`}
                    >
                      <span>
                        {key}) {val}
                      </span>
                      {isCorrect && <span className="ml-auto text-xs font-semibold text-emerald-600">Doğru cevap ✓</span>}
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <div className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">Açıklama</p>
                  <p>{q.explanation}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Link href="/ogrenci" className="text-center text-sm font-medium text-indigo-600 underline">
        ← Panel Anasayfasına Dön
      </Link>
    </div>
  );
}
