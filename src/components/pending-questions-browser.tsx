"use client";

import { useMemo, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { ApproveButton } from "@/components/approve-button";
import { AiCheckButton } from "@/components/ai-check-button";

export type PendingQuestion = {
  id: string;
  body: string;
  options: Record<string, string>;
  correct_option: string;
  source: string;
  difficulty: number | null;
  topic_id: string;
};

export type TopicRef = {
  id: string;
  name: string;
  grade_level: number | null;
  subject_id: string;
  subject_name: string;
};

function Dot({ lit }: { lit: boolean }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${lit ? "bg-amber-500" : "bg-slate-300"}`}
      aria-hidden="true"
    />
  );
}

function TabButton({
  active,
  lit,
  onClick,
  children,
}: {
  active: boolean;
  lit: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex touch-manipulation items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-indigo-500 bg-indigo-600 text-white"
          : lit
            ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
            : "border-slate-200 text-slate-500 hover:bg-slate-50"
      }`}
    >
      <Dot lit={lit} />
      {children}
    </button>
  );
}

// Soru Onayi ekranini "Sorular" katalogundaki (all-questions-browser.tsx) ayni
// sinif > ders > konu sekmesi mantigiyla kuruyoruz - ama burada sadece onay
// bekleyen sorular sayiliyor ve onay bekleyen sekmelerde amber bir "isik"
// (nokta) yaniyor, boylece admin/ogretmen butun agaci gezmeden nerede islem
// gerektigini hemen goruyor. Sayfa ilk acildiginda da onay bekleyen ilk
// sinif/ders/konu otomatik seciliyor.
export function PendingQuestionsBrowser({ topics, questions }: { topics: TopicRef[]; questions: PendingQuestion[] }) {
  const pendingCountByTopic = useMemo(() => {
    const map = new Map<string, number>();
    questions.forEach((q) => map.set(q.topic_id, (map.get(q.topic_id) ?? 0) + 1));
    return map;
  }, [questions]);

  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  const grades = useMemo(() => {
    const set = new Set<number>();
    topics.forEach((t) => {
      if (t.grade_level != null) set.add(t.grade_level);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [topics]);

  const gradePendingCount = useMemo(() => {
    const map = new Map<number, number>();
    topics.forEach((t) => {
      if (t.grade_level == null) return;
      map.set(t.grade_level, (map.get(t.grade_level) ?? 0) + (pendingCountByTopic.get(t.id) ?? 0));
    });
    return map;
  }, [topics, pendingCountByTopic]);

  // Ilk acilista onay bekleyen ilk sinif/ders/konuyu otomatik sec - admin
  // veya ogretmen sayfaya girer girmez yapilacak isi gormeli.
  const firstPendingGrade = useMemo(
    () => grades.find((g) => (gradePendingCount.get(g) ?? 0) > 0) ?? grades[0] ?? null,
    [grades, gradePendingCount]
  );

  const [selectedGrade, setSelectedGrade] = useState<number | null>(firstPendingGrade);

  const subjectsForGrade = useMemo(() => {
    if (selectedGrade == null) return [];
    const bySubject = new Map<string, { id: string; name: string; pending: number }>();
    topics
      .filter((t) => t.grade_level === selectedGrade)
      .forEach((t) => {
        const entry = bySubject.get(t.subject_id) ?? { id: t.subject_id, name: t.subject_name, pending: 0 };
        entry.pending += pendingCountByTopic.get(t.id) ?? 0;
        bySubject.set(t.subject_id, entry);
      });
    return Array.from(bySubject.values()).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [topics, selectedGrade, pendingCountByTopic]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(() => {
    if (firstPendingGrade == null) return null;
    const inGrade = topics.filter((t) => t.grade_level === firstPendingGrade);
    const withPending = inGrade.find((t) => (pendingCountByTopic.get(t.id) ?? 0) > 0);
    return (withPending ?? inGrade[0])?.subject_id ?? null;
  });

  const topicsForGradeSubject = useMemo(() => {
    if (selectedGrade == null || !selectedSubjectId) return [];
    return topics
      .filter((t) => t.grade_level === selectedGrade && t.subject_id === selectedSubjectId)
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [topics, selectedGrade, selectedSubjectId]);

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(() => {
    if (firstPendingGrade == null) return null;
    const inGrade = topics.filter((t) => t.grade_level === firstPendingGrade);
    const withPending = inGrade.find((t) => (pendingCountByTopic.get(t.id) ?? 0) > 0);
    return (withPending ?? inGrade[0])?.id ?? null;
  });

  const questionsForTopic = useMemo(() => {
    if (!selectedTopicId) return [];
    return questions.filter((q) => q.topic_id === selectedTopicId);
  }, [questions, selectedTopicId]);

  function pickGrade(g: number) {
    setSelectedGrade(g);
    const inGrade = topics.filter((t) => t.grade_level === g);
    const withPending = inGrade.find((t) => (pendingCountByTopic.get(t.id) ?? 0) > 0);
    const picked = withPending ?? inGrade[0];
    setSelectedSubjectId(picked?.subject_id ?? null);
    setSelectedTopicId(picked?.id ?? null);
  }

  function pickSubject(id: string) {
    setSelectedSubjectId(id);
    const inSubject = topics.filter((t) => t.grade_level === selectedGrade && t.subject_id === id);
    const withPending = inSubject.find((t) => (pendingCountByTopic.get(t.id) ?? 0) > 0);
    setSelectedTopicId((withPending ?? inSubject[0])?.id ?? null);
  }

  const totalPending = questions.length;
  const selectedTopic = selectedTopicId ? topicById.get(selectedTopicId) : undefined;

  if (grades.length === 0) {
    return <p className="text-sm text-slate-500">Henüz konu tanımlı değil.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {totalPending === 0 && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Onay bekleyen soru yok.</p>
      )}

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Sınıf</p>
        <div className="flex flex-wrap gap-1.5">
          {grades.map((g) => (
            <TabButton key={g} active={selectedGrade === g} lit={(gradePendingCount.get(g) ?? 0) > 0} onClick={() => pickGrade(g)}>
              {g}. sınıf{(gradePendingCount.get(g) ?? 0) > 0 ? ` (${gradePendingCount.get(g)})` : ""}
            </TabButton>
          ))}
        </div>
      </div>

      {selectedGrade != null && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Ders</p>
          {subjectsForGrade.length === 0 ? (
            <p className="text-xs text-slate-500">Bu sınıfta henüz konu yok.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {subjectsForGrade.map((s) => (
                <TabButton key={s.id} active={selectedSubjectId === s.id} lit={s.pending > 0} onClick={() => pickSubject(s.id)}>
                  {s.name}
                  {s.pending > 0 ? ` (${s.pending})` : ""}
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
              <TabButton
                key={t.id}
                active={selectedTopicId === t.id}
                lit={(pendingCountByTopic.get(t.id) ?? 0) > 0}
                onClick={() => setSelectedTopicId(t.id)}
              >
                {t.name}
                {(pendingCountByTopic.get(t.id) ?? 0) > 0 ? ` (${pendingCountByTopic.get(t.id)})` : ""}
              </TabButton>
            ))}
          </div>
        </div>
      )}

      {selectedTopic && (
        <div className="flex flex-col gap-4">
          {questionsForTopic.length === 0 ? (
            <p className="text-sm text-slate-500">
              <strong>{selectedTopic.name}</strong> konusunda onay bekleyen soru yok.
            </p>
          ) : (
            questionsForTopic.map((q) => (
              <Card key={q.id}>
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone="amber">{q.source === "ai" ? "AI üretimi" : q.source}</Badge>
                  <Badge>{selectedTopic.name}</Badge>
                  {q.difficulty != null && <Badge>Zorluk {q.difficulty}/5</Badge>}
                </div>
                <p className="font-medium text-slate-900">{q.body}</p>
                <ul className="mt-2 grid grid-cols-1 gap-1 text-sm text-slate-600 md:grid-cols-2">
                  {Object.entries(q.options ?? {}).map(([key, val]) => (
                    <li key={key} className={key === q.correct_option ? "font-semibold text-emerald-700" : ""}>
                      {key}) {val}
                    </li>
                  ))}
                </ul>
                <AiCheckButton questionId={q.id} />
                <ApproveButton questionId={q.id} />
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}