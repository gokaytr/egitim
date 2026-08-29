"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui";

type Question = {
  id: string;
  body: string;
  options: Record<string, string>;
  correct_option: string;
  is_approved: boolean;
  source: string;
  difficulty: number | null;
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

// Tum sorularin sinif sinif, ders ders, konu konu goz atilabildigi salt-okunur
// bir katalog. Soru Onayi (sadece onay bekleyenler) ve Soru Ekle'den farkli
// olarak, en ustteki Onayli/Onaysiz sekmesiyle secilen onay durumundaki tum
// sorulari gruplu sekilde gosterir.
export function AllQuestionsBrowser({ topics, questions }: { topics: Topic[]; questions: Question[] }) {
  const [approvalFilter, setApprovalFilter] = useState<"approved" | "unapproved">("approved");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const approvedCount = useMemo(() => questions.filter((q) => q.is_approved).length, [questions]);
  const unapprovedCount = questions.length - approvedCount;

  const filteredQuestions = useMemo(
    () => questions.filter((q) => (approvalFilter === "approved" ? q.is_approved : !q.is_approved)),
    [questions, approvalFilter],
  );

  const questionCountByTopic = useMemo(() => {
    const map = new Map<string, number>();
    filteredQuestions.forEach((q) => map.set(q.topic_id, (map.get(q.topic_id) ?? 0) + 1));
    return map;
  }, [filteredQuestions]);

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
    return filteredQuestions.filter((q) => q.topic_id === selectedTopicId);
  }, [filteredQuestions, selectedTopicId]);

  function pickApprovalFilter(f: "approved" | "unapproved") {
    setApprovalFilter(f);
    setSelectedGrade(null);
    setSelectedSubjectId(null);
    setSelectedTopicId(null);
  }

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
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => pickApprovalFilter("approved")}
          className={`touch-manipulation rounded-lg px-3 py-2 text-sm font-medium transition ${
            approvalFilter === "approved" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Onaylı ({approvedCount})
        </button>
        <button
          type="button"
          onClick={() => pickApprovalFilter("unapproved")}
          className={`touch-manipulation rounded-lg px-3 py-2 text-sm font-medium transition ${
            approvalFilter === "unapproved" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Onaysız ({unapprovedCount})
        </button>
      </div>

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
            <p className="text-xs text-slate-500">Bu sınıfta henüz konu yok.</p>
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
            <p className="text-sm text-slate-500">Bu konuda henüz soru yok.</p>
          ) : (
            questionsForTopic.map((q, i) => (
              <div key={q.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={q.is_approved ? "green" : "amber"}>{q.is_approved ? "Onaylı" : "Onay bekliyor"}</Badge>
                  <Badge>{q.source === "ai" ? "AI üretimi" : q.source}</Badge>
                  {q.difficulty != null && <Badge>Zorluk {q.difficulty}/5</Badge>}
                </div>
                <p className="font-medium text-slate-900">{i + 1}. {q.body}</p>
                <ul className="mt-1.5 grid grid-cols-1 gap-1 text-slate-600 sm:grid-cols-2">
                  {Object.entries(q.options ?? {}).map(([key, val]) => (
                    <li key={key} className={key === q.correct_option ? "font-semibold text-emerald-700" : ""}>
                      {key}) {val}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
