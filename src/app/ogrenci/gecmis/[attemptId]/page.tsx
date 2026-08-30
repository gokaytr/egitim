import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { AnswerReviewList } from "@/components/answer-review-list";
import { resolveEffectiveStudent } from "@/lib/student/effective-student";

// Gecmis Sonuclarim listesinden acilan tek bir denemenin/testin detayi -
// o an cozerken gorunen sonuc ekraniyla ayni "Soru Soru Inceleme" bicimini
// (dogru cevaplananlar dahil, her soru icin aciklama) burada da gosteriyoruz.
export default async function GecmisDetayPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const supabase = await createClient();
  const { studentId } = await resolveEffectiveStudent();

  const { data: attempt } = await supabase
    .from("student_attempts")
    .select(
      "id, student_id, finished_at, correct_count, wrong_count, empty_count, topics(name), exams(title, exam_type)"
    )
    .eq("id", attemptId)
    .single();

  // Onizlenen/gercek ogrencinin kendi denemesi disindaki bir kayda
  // erisilmesin diye ek bir kontrol - RLS zaten bunu engeller ama burada
  // acikca dogrulayip yanlis ogrenciye ait bir sonucun sizmasini onluyoruz.
  if (!attempt || attempt.student_id !== studentId) {
    notFound();
  }

  const { data: logs } = await supabase
    .from("answer_logs")
    .select("selected_option, questions(id, body, options, correct_option, explanation)")
    .eq("attempt_id", attemptId);

  const questions = (logs ?? [])
    .map((l) => (Array.isArray(l.questions) ? l.questions[0] : l.questions))
    .filter((q): q is NonNullable<typeof q> => !!q);

  const answers: Record<string, string> = {};
  for (const l of logs ?? []) {
    const q = Array.isArray(l.questions) ? l.questions[0] : l.questions;
    if (q && l.selected_option) answers[q.id] = l.selected_option;
  }

  const topic = Array.isArray(attempt.topics) ? attempt.topics[0] : attempt.topics;
  const exam = Array.isArray(attempt.exams) ? attempt.exams[0] : attempt.exams;
  const title = topic?.name ?? exam?.title ?? "Test";
  const total = questions.length || 1;
  const pct = Math.round((attempt.correct_count / total) * 100);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/ogrenci/gecmis" className="text-sm font-medium text-indigo-600 underline">
          ← Geçmiş Sonuçlarım
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500">
          {attempt.finished_at ? new Date(attempt.finished_at).toLocaleString("tr-TR") : ""}
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            Doğru: {attempt.correct_count} · Yanlış: {attempt.wrong_count} · Boş: {attempt.empty_count}
          </p>
          <Badge tone={pct >= 80 ? "green" : pct >= 50 ? "amber" : "red"}>Başarı: %{pct}</Badge>
        </div>
      </Card>

      {questions.length > 0 && <AnswerReviewList questions={questions} answers={answers} />}

      <Link href="/ogrenci" className="text-center text-sm font-medium text-indigo-600 underline">
        ← Panel Anasayfasına Dön
      </Link>
    </div>
  );
}
