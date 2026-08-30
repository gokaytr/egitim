"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Badge } from "@/components/ui";
import { QuestionAnswerList, DEFAULT_QUIZ_DISPLAY_SETTINGS, type QuizDisplaySettings } from "@/components/question-answer-list";
import { AnswerReviewList } from "@/components/answer-review-list";
import { levelFromScore, LEVEL_TITLES } from "@/lib/deneme/level";

type Question = {
  id: string;
  body: string;
  options: Record<string, string>;
  correct_option: string;
  explanation?: string | null;
  option_error_tags?: Record<string, string> | null;
  image_url?: string | null;
  topic_id: string;
  topics?: { name: string } | { name: string }[] | null;
};

function topicNameOf(q: Question): string {
  const t = Array.isArray(q.topics) ? q.topics[0] : q.topics;
  return t?.name ?? "Genel";
}

export function ExamRunner({
  examId,
  examType,
  questions,
  quizSettings = DEFAULT_QUIZ_DISPLAY_SETTINGS,
}: {
  examId: string;
  examType: string;
  questions: Question[];
  quizSettings?: QuizDisplaySettings;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: number; wrong: number; empty: number; pct: number } | null>(null);

  const isSeviyeTespit = examType === "seviye_tespit";

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
      const error_tag = selected && !isCorrect ? q.option_error_tags?.[selected] ?? null : null;
      return { question_id: q.id, selected_option: selected, is_correct: isCorrect, error_tag };
    });

    const total = questions.length || 1;
    const pct = Math.round((correct / total) * 100);

    try {
      const { data: attempt, error: attemptError } = await supabase
        .from("student_attempts")
        .insert({
          student_id: userData.user?.id,
          exam_id: examId,
          total_questions: questions.length,
          correct_count: correct,
          wrong_count: wrong,
          empty_count: empty,
          finished_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (attemptError || !attempt) {
        throw new Error(attemptError?.message ?? "Deneme sonucu kaydedilemedi.");
      }

      await supabase.from("answer_logs").insert(logs.map((l) => ({ ...l, attempt_id: attempt.id })));

      if (isSeviyeTespit && userData.user) {
        const level = levelFromScore(pct);
        await supabase
          .from("profiles")
          .update({ level_label: level, level_score: pct, level_assessed_at: new Date().toISOString() })
          .eq("id", userData.user.id);
      }

      setResult({ correct, wrong, empty, pct });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deneme kaydedilirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const level = levelFromScore(result.pct);
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <Card>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Sonuç 🎉</h2>
          <p className="text-sm text-slate-600">
            Doğru: {result.correct} · Yanlış: {result.wrong} · Boş: {result.empty} · Başarı: %{result.pct}
          </p>
          {error && <p className="mt-2 text-sm text-amber-600">{error}</p>}
          {isSeviyeTespit && (
            <div className="mt-4 rounded-xl bg-indigo-50 p-4">
              <Badge tone="default">Seviyen: {LEVEL_TITLES[level]}</Badge>
              <p className="mt-2 text-sm text-slate-700">
                Bu sonuca göre sana uygun zorlukta denemeler önerebiliriz. Genel Bakış sayfasından &quot;Sana Uygun
                Deneme&quot; ile devam edebilirsin.
              </p>
            </div>
          )}
          <Link href="/ogrenci" className="mt-4 inline-block text-sm font-medium text-indigo-600 underline">
            ← Genel Bakışa dön
          </Link>
        </Card>
        <AnswerReviewList
          questions={questions.map((q) => ({
            id: q.id,
            body: q.body,
            options: q.options,
            correct_option: q.correct_option,
            explanation: q.explanation,
          }))}
          answers={answers}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <QuestionAnswerList
        questions={questions.map((q) => ({
          id: q.id,
          body: q.body,
          options: q.options,
          image_url: q.image_url,
          topicLabel: topicNameOf(q),
        }))}
        answers={answers}
        onAnswer={(questionId, option) => setAnswers({ ...answers, [questionId]: option })}
        settings={quizSettings}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={handleSubmit} disabled={submitting} className="w-fit">
        {submitting ? "Değerlendiriliyor..." : "Denemeyi Bitir"}
      </Button>
    </div>
  );
}
