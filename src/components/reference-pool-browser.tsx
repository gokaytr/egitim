"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui";
import { DIFFICULTY_LABELS, type QuestionDifficulty } from "@/lib/questions/difficulty";
import { ReferencePoolToggleButton } from "@/components/reference-pool-toggle-button";
import { QuestionEditForm, type EditableQuestion } from "@/components/question-edit-form";

type Question = EditableQuestion & {
  topic_id: string;
};

type Topic = {
  id: string;
  name: string;
  grade_level: number | null;
  subject_id: string;
  subject_name: string;
};

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`touch-manipulation rounded-full border px-3 py-1 text-xs font-medium transition ${
        active ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

// Admin'in Soru Havuzu (referans/AI egitim) sekmesindeki, sinif -> ders ->
// konu seklinde goz atilabilen liste. Eskiden bu bilesen (AllQuestionsBrowser)
// onayli/onaysiz TUM sorulari da gosteriyordu - artik Soru Havuzu SADECE
// is_reference_only sorulardan olustugu icin (bkz. CLAUDE.md, kullanicinin
// "sadece admin paneline soru havuzu ekle, sadece sistemi egitmek uzere
// olsun" talebi) o filtreye gerek kalmadi, dogrudan referans havuzu
// icerigini listeler. Admin her soruyu duzenleyebilir.
export function ReferencePoolBrowser({ topics, questions }: { topics: Topic[]; questions: Question[] }) {
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const questionCountByTopic = useMemo(() => {
    const map = new Map<string, number>();
    questions.forEach((q) => map.set(q.topic_id, (map.get(q.topic_id) ?? 0) + 1));
    return map;
  }, [questions]);

  const gradeCounts = useMemo(() => {
    const map = new Map<number, number>();
    topics.forEach((t) => {
      if (t.grade_level == null) return;
      map.set(t.grade_level, (map.get(t.grade_level) ?? 0) + (questionCountByTopic.get(t.id) ?? 0));
    });
    return map;
  }, [topics, questionCountByTopic]);

  const subjectsForGrade = useMemo(() => {
    if (selectedGrade == null) return [];
    const bySubject = new Map<string, { id: string; name: string; count: number }>();
    topics
      .filter((t) => t.grade_level === selectedGrade)
      .forEach((t) => {
        const entry = bySubject.get(t.subject_id) ?? { id: t.subject_id, name: t.subject_name, count: 0 };
        entry.count += questionCountByTopic.get(t.id) ?? 0;
        bySubject.set(t.subject_id, entry);
      });
    return Array.from(bySubject.values()).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [topics, selectedGrade, questionCountByTopic]);

  const topicsForGradeSubject = useMemo(() => {
    if (selectedGrade == null || !selectedSubjectId) return [];
    return topics.filter((t) => t.grade_level === selectedGrade && t.subject_id === selectedSubjectId);
  }, [topics, selectedGrade, selectedSubjectId]);

  const questionsForTopic = useMemo(() => {
    if (!selectedTopicId) return [];
    return questions.filter((q) => q.topic_id === selectedTopicId);
  }, [questions, selectedTopicId]);

  function pickGrade(g: number) {
    setSelectedGrade(g);
    setSelectedSubjectId(null);
    setSelectedTopicId(null);
  }

  function pickSubject(id: string) {
    setSelectedSubjectId(id);
    setSelectedTopicId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-slate-700">Havuzda toplam {questions.length} soru var.</p>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Sınıf</p>
        <div className="flex flex-wrap gap-1.5">
          {GRADES.map((g) => (
            <TabButton key={g} active={selectedGrade === g} onClick={() => pickGrade(g)}>
              {g}. sınıf ({gradeCounts.get(g) ?? 0})
            </TabButton>
          ))}
        </div>
      </div>

      {selectedGrade != null && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Ders</p>
          {subjectsForGrade.length === 0 ? (
            <p className="text-xs text-slate-500">Bu sınıfta havuzda soru yok.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {subjectsForGrade.map((s) => (
                <TabButton key={s.id} active={selectedSubjectId === s.id} onClick={() => pickSubject(s.id)}>
                  {s.name} ({s.count})
                </TabButton>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedGrade != null && selectedSubjectId && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Konu</p>
          <div className="flex flex-wrap gap-1.5">
            {topicsForGradeSubject.map((t) => (
              <TabButton key={t.id} active={selectedTopicId === t.id} onClick={() => setSelectedTopicId(t.id)}>
                {t.name} ({questionCountByTopic.get(t.id) ?? 0})
              </TabButton>
            ))}
          </div>
        </div>
      )}

      {selectedTopicId && (
        <div className="flex flex-col gap-3">
          {questionsForTopic.length === 0 ? (
            <p className="text-sm text-slate-500">Bu konuda havuzda henüz soru yok.</p>
          ) : (
            questionsForTopic.map((q, i) => (
              <div key={q.id} className="rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone="default">🔒 Referans — öğrenciye gösterilmez</Badge>
                  {q.difficulty != null && <Badge>Zorluk: {DIFFICULTY_LABELS[q.difficulty as QuestionDifficulty]}</Badge>}
                  <Badge tone="green">Doğru cevap: {q.correct_option}</Badge>
                </div>
                <p className="font-medium text-slate-900">{i + 1}. {q.body}</p>
                <ul className="mt-1.5 grid grid-cols-1 gap-1 text-slate-600 sm:grid-cols-2">
                  {Object.entries(q.options ?? {}).map(([key, val]) => {
                    const isCorrect = key === q.correct_option;
                    return (
                      <li key={key} className={isCorrect ? "font-semibold text-emerald-700" : ""}>
                        {key}) {val}
                        {isCorrect && " ✓"}
                      </li>
                    );
                  })}
                </ul>
                {q.explanation && (
                  <div className="mt-2 rounded-lg bg-indigo-50 p-2.5 text-xs text-indigo-900">
                    <p className="mb-0.5 font-semibold uppercase tracking-wide text-indigo-500">Açıklama</p>
                    <p>{q.explanation}</p>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <ReferencePoolToggleButton questionId={q.id} isReferenceOnly />
                  {editingId !== q.id && (
                    <button
                      type="button"
                      onClick={() => setEditingId(q.id)}
                      className="touch-manipulation text-xs font-medium text-indigo-600 hover:underline"
                    >
                      Düzenle
                    </button>
                  )}
                </div>
                {editingId === q.id && <QuestionEditForm question={q} onDone={() => setEditingId(null)} />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
