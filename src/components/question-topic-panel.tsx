"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button } from "@/components/ui";
import { TopicPickerTabs } from "@/components/topic-picker-tabs";
import { ManualQuestionForm } from "@/components/manual-question-form";
import { BulkQuestionImport } from "@/components/bulk-question-import";
import { AiQuestionGenerate } from "@/components/ai-question-generate";
import { QuestionEditForm, type EditableQuestion } from "@/components/question-edit-form";

export type PanelTopic = {
  id: string;
  name: string;
  grade_level: number | null;
  subject_id: string;
  subject_name: string;
  exam_types: string[] | null;
  target_question_count: number | null;
};

type PanelQuestion = EditableQuestion & {
  is_approved: boolean;
  follows_new_policy: boolean;
};

const DEFAULT_TARGET = 60;
const LOAD_LIMIT = 300;

// Kullanicinin defalarca "olmadi, karisik oldu" dedigi sinif/sinav x ders
// matrisi (question-bank-browser.tsx, artik silindi) tamamen terk edildi.
// Bunun yerine, uygulamada zaten calisan ve kullanicidan sikayet gelmeyen
// tek bir kalip tekrar kullaniliyor: Soru Ekle ekraninda ve Soru Havuzu'nda
// zaten var olan "sinif -> ders -> (sinav) -> konu" sekmeli secici
// (TopicPickerTabs). Konu secilince o konunun sorulari, ekleme butonu ve
// onay butonu AYNI YERDE, duz bir liste halinde gorunur - grid/hucre
// kavrami yok, floating panel yok.
export function QuestionTopicPanel({
  topics,
  counts,
  subjectIds,
  isAdmin,
}: {
  topics: PanelTopic[];
  counts: Map<string, number>;
  subjectIds?: string[];
  isAdmin: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  const [topicId, setTopicId] = useState("");
  const [questions, setQuestions] = useState<PanelQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const selectedTopic = topicId ? topicById.get(topicId) : undefined;

  async function pickTopic(id: string) {
    setTopicId(id);
    setAddOpen(false);
    setEditingId(null);
    if (!id) {
      setQuestions([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("questions")
      .select("id, body, options, correct_option, explanation, difficulty, is_approved, follows_new_policy")
      .eq("topic_id", id)
      .eq("is_reference_only", false)
      .order("created_at", { ascending: false })
      .limit(LOAD_LIMIT);
    setQuestions(
      ((data ?? []) as Record<string, unknown>[]).map((q) => ({
        id: q.id as string,
        body: q.body as string,
        options: (q.options ?? {}) as Record<string, string>,
        correct_option: q.correct_option as string,
        explanation: (q.explanation as string) ?? null,
        difficulty: q.difficulty as EditableQuestion["difficulty"],
        is_approved: !!q.is_approved,
        follows_new_policy: !!q.follows_new_policy,
      }))
    );
    setLoading(false);
  }

  async function approveQuestion(id: string) {
    setApprovingId(id);
    const { data: userData } = await supabase.auth.getUser();
    await supabase
      .from("questions")
      .update({ is_approved: true, approved_by: userData.user?.id ?? null, approved_at: new Date().toISOString() })
      .eq("id", id);
    setApprovingId(null);
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, is_approved: true } : q)));
  }

  if (topics.length === 0) {
    return <p className="text-sm text-slate-500">Henüz hiç konu (müfredat) eklenmemiş.</p>;
  }

  const added = selectedTopic ? counts.get(selectedTopic.id) ?? 0 : 0;
  const target = selectedTopic ? selectedTopic.target_question_count ?? DEFAULT_TARGET : 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Konu</label>
        <TopicPickerTabs value={topicId} onChange={pickTopic} subjectIds={subjectIds} />
      </div>

      {selectedTopic && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-800">{selectedTopic.name}</p>
              <Badge tone={added >= target ? "green" : added > 0 ? "amber" : "default"}>
                {added}/{target} soru
              </Badge>
            </div>
            <Button variant="secondary" onClick={() => setAddOpen((v) => !v)}>
              {addOpen ? "Kapat" : "+ Soru Ekle"}
            </Button>
          </div>

          {addOpen && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ManualQuestionForm topicId={selectedTopic.id} />
                <BulkQuestionImport topicId={selectedTopic.id} subjectIds={subjectIds} />
              </div>
              {isAdmin && (
                <div className="mt-6 max-w-xl border-t border-slate-200 pt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Badge tone="amber">Test aşamasında</Badge>
                    <p className="text-sm text-slate-500">Yapay zeka ile soru üret, ara sıra hata verebilir.</p>
                  </div>
                  <AiQuestionGenerate topicId={selectedTopic.id} onStatus={setStatus} />
                  {status && <p className="mt-2 text-sm text-slate-600">{status}</p>}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <p className="text-xs text-slate-400">Yükleniyor…</p>
          ) : questions.length === 0 ? (
            <p className="text-xs text-slate-400">Bu konuda henüz soru yok.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {questions.map((q, i) => (
                <li key={q.id} className="rounded-lg border border-slate-200 p-2.5 text-sm">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                    {q.follows_new_policy && <Badge tone="amber">*</Badge>}
                    <Badge tone={q.is_approved ? "green" : "amber"}>{q.is_approved ? "Onaylı" : "Onay bekliyor"}</Badge>
                    {!q.is_approved && (
                      <button
                        type="button"
                        disabled={approvingId === q.id}
                        onClick={() => approveQuestion(q.id)}
                        className="touch-manipulation font-medium text-emerald-600 hover:underline disabled:opacity-50"
                      >
                        {approvingId === q.id ? "Onaylanıyor…" : "Onayla"}
                      </button>
                    )}
                  </div>
                  <p className="font-medium text-slate-900">
                    {i + 1}. {q.body}
                  </p>
                  <ul className="mt-2 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                    {Object.entries(q.options ?? {}).map(([key, val]) => {
                      const isCorrect = key === q.correct_option;
                      return (
                        <li
                          key={key}
                          className={`rounded-lg border px-2.5 py-1.5 ${
                            isCorrect
                              ? "border-emerald-400 bg-emerald-50 font-semibold text-emerald-800"
                              : "border-slate-200 text-slate-600"
                          }`}
                        >
                          {key}) {val}
                          {isCorrect && " ✓"}
                        </li>
                      );
                    })}
                  </ul>
                  {q.explanation && (
                    <div className="mt-2 rounded-lg bg-indigo-50 p-2.5 text-xs text-indigo-900">
                      <p className="mb-1 font-semibold uppercase tracking-wide text-indigo-500">Açıklama</p>
                      <p>{q.explanation}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingId(editingId === q.id ? null : q.id)}
                    className="mt-2 touch-manipulation text-xs font-medium text-indigo-600 hover:underline"
                  >
                    {editingId === q.id ? "Kapat" : "Düzenle"}
                  </button>
                  {editingId === q.id && (
                    <div className="mt-2">
                      <QuestionEditForm question={q} onDone={() => setEditingId(null)} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
