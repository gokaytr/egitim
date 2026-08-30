"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, Badge, Button } from "@/components/ui";
import { QuestionAnswerList, DEFAULT_QUIZ_DISPLAY_SETTINGS, type QuizDisplaySettings } from "@/components/question-answer-list";
import { AnswerReviewList } from "@/components/answer-review-list";
import { PreQuizCountdown } from "@/components/pre-quiz-countdown";
import { EvaluationHeartbeat } from "@/components/evaluation-heartbeat";
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
  examTitle,
  examType,
  durationMinutes,
  questions,
  quizSettings = DEFAULT_QUIZ_DISPLAY_SETTINGS,
  gradeLevel,
}: {
  examId: string;
  examTitle: string;
  examType: string;
  durationMinutes?: number | null;
  questions: Question[];
  quizSettings?: QuizDisplaySettings;
  gradeLevel?: number | null;
}) {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [result, setResult] = useState<{ correct: number; wrong: number; empty: number; pct: number } | null>(null);
  const [plannedTopicNames, setPlannedTopicNames] = useState<string[]>([]);

  const isSeviyeTespit = examType === "seviye_tespit";

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    let correct = 0, wrong = 0, empty = 0;
    // Yanlis/bos birakilan sorularin konularini da topluyoruz - seviye
    // tespit bittiginde "cozmen gereken konular" olarak ogrenciye
    // gosterecegiz ve calisma programina (takvime) ekleyecegiz.
    const weakTopicIds = new Set<string>();
    const topicNameById = new Map<string, string>();
    const logs = questions.map((q) => {
      const selected = answers[q.id] ?? null;
      const isCorrect = selected === q.correct_option;
      topicNameById.set(q.topic_id, topicNameOf(q));
      if (!selected) {
        empty++;
        weakTopicIds.add(q.topic_id);
      } else if (isCorrect) {
        correct++;
      } else {
        wrong++;
        weakTopicIds.add(q.topic_id);
      }
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

        // Seviye tespitte zorlandigi konular icin otomatik olarak calisma
        // programina (takvime) hedef ekliyoruz - "auto"/"placement" ile ayni
        // desende, kaynagi "seviye_tespit" olarak isaretliyoruz. Boylece bu
        // konular Genel Bakis sayfasindaki "Hedeflerim" ve "Cozulmesi
        // Gerekenler" listelerinde otomatik olarak beliriyor.
        if (weakTopicIds.size > 0) {
          let plan: { id: string } | null = null;
          const { data: existingPlan } = await supabase
            .from("study_plans")
            .select("id")
            .eq("student_id", userData.user.id)
            .eq("status", "active")
            .maybeSingle();
          plan = existingPlan;

          if (!plan) {
            const { data: newPlan } = await supabase
              .from("study_plans")
              .insert({ student_id: userData.user.id, exam_target: "TYT" })
              .select("id")
              .single();
            plan = newPlan;
          }

          if (plan) {
            const { data: existingItems } = await supabase
              .from("study_plan_items")
              .select("topic_id")
              .eq("plan_id", plan.id)
              .neq("status", "done");
            const alreadyPlanned = new Set((existingItems ?? []).map((i) => i.topic_id));

            const toInsert = Array.from(weakTopicIds)
              .filter((topicId) => !alreadyPlanned.has(topicId))
              .map((topicId) => ({
                plan_id: plan!.id,
                topic_id: topicId,
                target_questions: 10,
                target_minutes: 20,
                source: "seviye_tespit",
              }));

            if (toInsert.length > 0) {
              await supabase.from("study_plan_items").insert(toInsert);
            }
          }

          setPlannedTopicNames(Array.from(weakTopicIds).map((id) => topicNameById.get(id) ?? "Genel"));
        }
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
          <Button
            variant={showReview ? "secondary" : "primary"}
            onClick={() => setShowReview((v) => !v)}
            className="mt-3 w-full sm:w-auto"
          >
            {showReview ? "İncelemeyi kapat" : "📋 Yanlışlarımı incele"}
          </Button>
          {error && <p className="mt-2 text-sm text-amber-600">{error}</p>}
          {isSeviyeTespit && (
            <div className="mt-4 rounded-xl bg-indigo-50 p-4">
              <Badge tone="default">Seviyen: {LEVEL_TITLES[level]}</Badge>
              <p className="mt-2 text-sm text-slate-700">
                Bu sonuca göre sana uygun zorlukta denemeler önerebiliriz. Genel Bakış sayfasından &quot;Sana Uygun
                Deneme&quot; ile devam edebilirsin.
              </p>
              {plannedTopicNames.length > 0 && (
                <div className="mt-3 rounded-lg bg-white/70 p-3">
                  <p className="text-sm font-medium text-indigo-900">
                    Çözmen gereken konular: {plannedTopicNames.join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-indigo-700">
                    Bu konuları senin için çalışma takvimine ekliyoruz — Genel Bakış sayfasındaki &quot;Çözülmesi
                    Gerekenler&quot; listesinde göreceksin.
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
        {showReview && (
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
        )}
        <Link href="/ogrenci" className="text-center text-sm font-medium text-indigo-600 underline">
          ← Panel Anasayfasına Dön
        </Link>
      </div>
    );
  }

  if (!started) {
    return (
      <PreQuizCountdown
        topicLabel={examTitle}
        durationLabel={durationMinutes ? `${questions.length} soru · yaklaşık ${durationMinutes} dakika` : `${questions.length} soru`}
        gradeLevel={gradeLevel}
        onDone={() => setStarted(true)}
      />
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
        onFinish={handleSubmit}
        finishing={submitting}
        finishLabel="Denemeyi Bitir"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <EvaluationHeartbeat active={submitting} />
    </div>
  );
}
