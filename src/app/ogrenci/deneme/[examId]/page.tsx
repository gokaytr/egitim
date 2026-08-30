import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { ExamRunner } from "./exam-runner";
import { getStudentQuizSettings } from "@/lib/student/quiz-settings";
import { resolveEffectiveStudent } from "@/lib/student/effective-student";

export default async function DenemePage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const supabase = await createClient();
  // Admin bir test ogrenciyi onizlerken auth.uid() admin'in kendisi olur;
  // sinav ayarlarinin (sure/gosterim bicimi) onizlenen ogrenciye gore
  // uygulanmasi icin etkin ogrenci id'si kullanilmali.
  const { studentId: effectiveStudentId } = await resolveEffectiveStudent();
  const quizSettings = await getStudentQuizSettings(effectiveStudentId);

  const [{ data: exam }, { data: examQuestions }] = await Promise.all([
    supabase.from("exams").select("id, title, exam_type, duration_minutes").eq("id", examId).single(),
    supabase
      .from("exam_questions")
      .select(
        "order_index, questions(id, body, options, correct_option, explanation, option_error_tags, image_url, topic_id, topics(name))"
      )
      .eq("exam_id", examId)
      .order("order_index"),
  ]);

  if (!exam) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Bu deneme bulunamadı ya da artık mevcut değil.</p>
      </Card>
    );
  }

  const questions = (examQuestions ?? [])
    .map((eq) => (Array.isArray(eq.questions) ? eq.questions[0] : eq.questions))
    .filter((q): q is NonNullable<typeof q> => !!q);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{exam.title}</h1>
        <p className="text-sm text-slate-500">
          {questions.length} soru · yaklaşık {exam.duration_minutes} dakika
        </p>
      </div>
      <ExamRunner examId={exam.id} examType={exam.exam_type} questions={questions} quizSettings={quizSettings} />
    </div>
  );
}
