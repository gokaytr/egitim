"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Badge } from "@/components/ui";

type Question = {
  id: string;
  body: string;
  options: Record<string, string>;
  correct_option: string;
};

export function QuizRunner({ topicId, questions }: { topicId: string; questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    correct: number;
    wrong: number;
    empty: number;
    diagnosis?: { ai_summary: string; common_error_pattern: string | null; recommended_action: string; weakness_level: string };
  } | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    let correct = 0, wrong = 0, empty = 0;
    const logs = questions.map((q) => {
      const selected = answers[q.id] ?? null;
      const isCorrect = selected === q.correct_option;
      if (!selected) empty++;
      else if (isCorrect) correct++;
      else wrong++;
      return { question_id: q.id, selected_option: selected, is_correct: isCorrect };
    });

    const { data: attempt } = await supabase
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

    if (attempt) {
      await supabase.from("answer_logs").insert(logs.map((l) => ({ ...l, attempt_id: attempt.id })));

      const res = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: attempt.id }),
      });
      const json = await res.json();
      setResult({ correct, wrong, empty, diagnosis: json.diagnosis });
    } else {
      setResult({ correct, wrong, empty });
    }
    setSubmitting(false);
  }

  if (result) {
    return (
      <Card className="max-w-2xl">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Sonuç</h2>
        <p className="text-sm text-slate-600">
          Doğru: {result.correct} · Yanlış: {result.wrong} · Boş: {result.empty}
        </p>
        {result.diagnosis && (
          <div className="mt-4 rounded-xl bg-indigo-50 p-4">
            <Badge tone={result.diagnosis.weakness_level === "major" ? "red" : result.diagnosis.weakness_level === "minor" ? "amber" : "green"}>
              Eksik seviyesi: {result.diagnosis.weakness_level}
            </Badge>
            <p className="mt-2 text-sm text-slate-700">{result.diagnosis.ai_summary}</p>
            {result.diagnosis.common_error_pattern && (
              <p className="mt-1 text-xs text-slate-500">Genel hata örüntün: {result.diagnosis.common_error_pattern}</p>
            )}
            {result.diagnosis.recommended_action === "tutor_referral" && (
              <p className="mt-2 text-sm font-medium text-indigo-700">
                Bu konuda özel derse yönlendirme talebin oluşturuldu, bir öğretmen seninle iletişime geçecek.
              </p>
            )}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q, i) => (
        <Card key={q.id}>
          <p className="font-medium text-slate-900">{i + 1}. {q.body}</p>
          <div className="mt-3 flex flex-col gap-2">
            {Object.entries(q.options).map(([key, val]) => (
              <label key={key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${answers[q.id] === key ? "border-indigo-500 bg-indigo-50" : "border-slate-200"}`}>
                <input
                  type="radio"
                  name={q.id}
                  className="accent-indigo-600"
                  checked={answers[q.id] === key}
                  onChange={() => setAnswers({ ...answers, [q.id]: key })}
                />
                <span>{key}) {val}</span>
              </label>
            ))}
          </div>
        </Card>
      ))}
      <Button onClick={handleSubmit} disabled={submitting} className="w-fit">
        {submitting ? "Değerlendiriliyor..." : "Testi Bitir"}
      </Button>
    </div>
  );
}
