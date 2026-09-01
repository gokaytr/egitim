"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, Button } from "@/components/ui";
import { QuestionAnswerList, DEFAULT_QUIZ_DISPLAY_SETTINGS, type QuizDisplaySettings } from "@/components/question-answer-list";
import { AnswerReviewList } from "@/components/answer-review-list";
import { PreQuizCountdown } from "@/components/pre-quiz-countdown";
import { ResultRevealSound } from "@/components/result-reveal-sound";

type Question = {
  id: string;
  body: string;
  options: Record<string, string>;
  correct_option: string;
  explanation?: string | null;
  option_error_tags?: Record<string, string> | null;
  image_url?: string | null;
};

export function QuizRunner({
  topicId,
  topicName,
  questions,
  quizSettings = DEFAULT_QUIZ_DISPLAY_SETTINGS,
  gradeLevel,
}: {
  topicId: string;
  topicName: string;
  questions: Question[];
  quizSettings?: QuizDisplaySettings;
  gradeLevel?: number | null;
}) {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [result, setResult] = useState<{
    correct: number;
    wrong: number;
    empty: number;
    diagnosis?: {
      ai_summary: string;
      student_summary?: string;
      common_error_pattern: string | null;
      recommended_action: string;
      weakness_level: string;
    };
  } | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    let correct = 0, wrong = 0, empty = 0;
    const logs = questions.map((q) => {
      const selected = answers[q.id] ?? null;
      const isCorrect = selected === q.correct_option;
      if (!selected) empty++;
      else if (isCorrect) correct++;
      else wrong++;
      // Öğretmenin soruya girdiği şık bazlı hata etiketi varsa (ör. "B" şıkkı
      // "işlem_hatası"), yanlış seçilen şıktan otomatik etiketleniyor - bu
      // etiketler kural tabanlı değerlendirmede hata örüntüsü çıkarmak için kullanılır.
      const error_tag = selected && !isCorrect ? q.option_error_tags?.[selected] ?? null : null;
      return { question_id: q.id, selected_option: selected, is_correct: isCorrect, error_tag };
    });

    try {
      const { data: attempt, error: attemptError } = await supabase
        .from("student_attempts")
        .insert({
          student_id: userData.user?.id,
          topic_id: topicId,
          total_questions: questions.length,
          correct_count: correct,
          wrong_count: wrong,
          empty_count: empty,
          finished_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (attemptError || !attempt) {
        throw new Error(attemptError?.message ?? "Deneme kaydedilemedi.");
      }

      await supabase.from("answer_logs").insert(logs.map((l) => ({ ...l, attempt_id: attempt.id })));

      // AI analizi 20 saniyede yanıt vermezse ekranı sonsuza kadar
      // bekletmemek için zaman aşımıyla yarıştırıyoruz. Analiz başarısız
      // olsa bile sonuçlar (doğru/yanlış/boş) her zaman gösterilir.
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Analiz zaman aşımına uğradı.")), 20000)
        );
        const res = (await Promise.race([
          fetch("/api/ai/diagnose", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attemptId: attempt.id }),
          }),
          timeout,
        ])) as Response;

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Analiz alınamadı.");
        setResult({ correct, wrong, empty, diagnosis: json.diagnosis });
      } catch (diagErr) {
        console.error("AI analizi başarısız", diagErr);
        setError("Sonuçların kaydedildi ama AI analizi şu anda üretilemedi. Daha sonra tekrar deneyebilirsin.");
        setResult({ correct, wrong, empty });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test kaydedilirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <ResultRevealSound />
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Sonuç</h2>
          <p className="mt-1 text-sm text-slate-500">&quot;{topicName}&quot; testini tamamladın, işte sonucun.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Card className="flex flex-col items-center gap-1 text-center">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Doğru</span>
            <span className="text-3xl font-semibold text-emerald-600 sm:text-4xl">{result.correct}</span>
          </Card>
          <Card className="flex flex-col items-center gap-1 text-center">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Yanlış</span>
            <span className="text-3xl font-semibold text-red-600 sm:text-4xl">{result.wrong}</span>
          </Card>
          <Card className="flex flex-col items-center gap-1 text-center">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Boş</span>
            <span className="text-3xl font-semibold text-slate-500 sm:text-4xl">{result.empty}</span>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="flex flex-col gap-3">
            <h3 className="font-semibold text-slate-900">Ne yapmak istersin?</h3>
            <Button
              variant={showReview ? "secondary" : "primary"}
              onClick={() => setShowReview((v) => !v)}
              className="w-full justify-center"
            >
              {showReview ? "İncelemeyi kapat" : "📋 Yanlışlarımı incele"}
            </Button>
            <Link href="/ogrenci" className="text-center text-sm font-medium text-indigo-600 underline">
              ← Panel Anasayfasına Dön
            </Link>
            {error && <p className="text-sm text-amber-600">{error}</p>}
          </Card>

          {result.diagnosis && (
            <Card className="bg-indigo-50">
              <h3 className="font-semibold text-indigo-900">Değerlendirme</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                {result.diagnosis.student_summary ?? result.diagnosis.ai_summary}
              </p>
              {result.diagnosis.recommended_action === "tutor_referral" && (
                <p className="mt-3 rounded-lg bg-white/70 p-3 text-sm font-medium text-indigo-700">
                  Bu konuda tekrar tekrar zorlandığını fark ettik. Bu durumu ailenle paylaştık; ailen isterse senin için
                  özel ders talebinde bulunabilir.
                </p>
              )}
            </Card>
          )}
        </div>

        {showReview && <AnswerReviewList questions={questions} answers={answers} />}
      </div>
    );
  }

  if (!started) {
    return (
      <PreQuizCountdown
        topicLabel={topicName}
        durationLabel={`${questions.length} soru`}
        gradeLevel={gradeLevel}
        onDone={() => setStarted(true)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <QuestionAnswerList
        questions={questions.map((q) => ({ id: q.id, body: q.body, options: q.options, image_url: q.image_url }))}
        answers={answers}
        onAnswer={(questionId, option) => setAnswers({ ...answers, [questionId]: option })}
        settings={quizSettings}
        onFinish={handleSubmit}
        finishing={submitting}
        finishLabel="Testi Bitir"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
