import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { resolveEffectiveStudent } from "@/lib/student/effective-student";

// Ogrencinin bugune kadar bitirdigi TUM konu testlerini ve denemelerini
// (yanlis/eksik cozulmus olsa dahi) tarih sirasiyla listeleyen ekran.
// Her satirdan detay sayfasina (/ogrenci/gecmis/[attemptId]) gecilip
// cevaplariyla birlikte soru soru incelenebiliyor - CLAUDE.md "Soru cevap
// aciklamasi kurali" geregi burada da her sorunun aciklamasi gorunur olmali.
export default async function GecmisSonuclarimPage() {
  const supabase = await createClient();
  const { studentId, isAdminPreview } = await resolveEffectiveStudent();

  if (isAdminPreview && !studentId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Geçmiş Sonuçlarım</h1>
          <p className="text-sm text-slate-500">Henüz önizlenebilecek bir test öğrenci bulunmuyor.</p>
        </div>
      </div>
    );
  }

  const { data: attempts } = await supabase
    .from("student_attempts")
    .select(
      "id, started_at, finished_at, total_questions, correct_count, wrong_count, empty_count, topic_id, exam_id, topics(name), exams(title, exam_type)"
    )
    .eq("student_id", studentId)
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Geçmiş Sonuçlarım</h1>
        <p className="text-sm text-slate-500">
          Bitirdiğin bütün test ve denemeler burada listelenir — yanlış yapmış olsan bile her birini tekrar açıp
          cevaplarını inceleyebilirsin.
        </p>
      </div>

      {!attempts?.length ? (
        <Card>
          <p className="text-sm text-slate-600">Henüz bitirdiğin bir test veya deneme yok.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {attempts.map((a) => {
            const topic = Array.isArray(a.topics) ? a.topics[0] : a.topics;
            const exam = Array.isArray(a.exams) ? a.exams[0] : a.exams;
            const title = topic?.name ?? exam?.title ?? "Test";
            const kind = exam ? (exam.exam_type === "seviye_tespit" ? "Seviye Tespit" : "Deneme") : "Konu Testi";
            const total = a.total_questions || a.correct_count + a.wrong_count + a.empty_count || 1;
            const pct = Math.round((a.correct_count / total) * 100);
            const redoHref = a.topic_id ? `/ogrenci/konu/${a.topic_id}` : a.exam_id ? `/ogrenci/deneme/${a.exam_id}` : null;
            return (
              <Card key={a.id} className="transition hover:border-indigo-300 hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/ogrenci/gecmis/${a.id}`} className="hover:underline">
                    <div className="flex items-center gap-2">
                      <Badge tone="default">{kind}</Badge>
                      <h2 className="font-semibold text-slate-900">{title}</h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {a.finished_at ? new Date(a.finished_at).toLocaleString("tr-TR") : ""}
                    </p>
                  </Link>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-600">
                      Doğru: {a.correct_count} · Yanlış: {a.wrong_count} · Boş: {a.empty_count}
                    </span>
                    <Badge tone={pct >= 80 ? "green" : pct >= 50 ? "amber" : "red"}>%{pct}</Badge>
                    <Link href={`/ogrenci/gecmis/${a.id}`} className="font-medium text-indigo-600 underline">
                      İncele →
                    </Link>
                    {redoHref && (
                      <Link href={redoHref} className="font-medium text-emerald-600 underline">
                        Tekrar Çöz ↻
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
