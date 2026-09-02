"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui";
import { QuestionEditForm, type EditableQuestion } from "@/components/question-edit-form";

export type BankTopic = {
  id: string;
  name: string;
  grade_level: number | null;
  subject_id: string;
  subject_name: string;
  exam_types: string[] | null;
};

export type BankShare = { id: string; exam_type: string; token: string };

const EXAM_ORDER = ["BILSEM", "LGS", "TYT", "AYT", "YKS", "KPSS", "ALES"];
const NO_EXAM_BUCKET = "Diğer";
const NO_GRADE_BUCKET = "Genel";

function examTagsOf(t: BankTopic): string[] {
  return t.exam_types && t.exam_types.length > 0 ? t.exam_types : [NO_EXAM_BUCKET];
}
function gradeKeyOf(t: BankTopic): string {
  return t.grade_level == null ? NO_GRADE_BUCKET : String(t.grade_level);
}
function gradeLabel(key: string): string {
  return key === NO_GRADE_BUCKET ? NO_GRADE_BUCKET : `${key}. Sınıf`;
}

type TopicQuestion = EditableQuestion & { is_approved: boolean; follows_new_policy: boolean };

// "Sorulara girince" (Sorular sayfasina girer girmez) once bos bir form
// yerine, sinav -> sinif -> ders -> konu seklinde tikla-goz-at bir soru
// sayaci gorulsun - talebi uzerine kuruldu. Kasitli olarak COK HAFIF:
// sunucudan sadece konu basina sayilar geliyor (butun sorular degil - onlar
// binlerce/on binlerce olacak, hepsini onceden indirmek istemiyoruz), bir
// konuya tiklaninca o konunun sorulari SADECE O AN supabase'den cekiliyor.
// canShare=true ise (sadece admin) her sinav kartinda bir "Paylas" butonu
// da var - Planlama ekranindaki ayni exam_shares mekanizmasini kullanir.
export function QuestionBankBrowser({
  topics,
  counts,
  shares,
  canShare,
}: {
  topics: BankTopic[];
  counts: Map<string, { approved: number; pending: number }>;
  shares?: Map<string, BankShare[]>;
  canShare: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);
  const [topicQuestions, setTopicQuestions] = useState<TopicQuestion[]>([]);
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sharePanelExam, setSharePanelExam] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [localShares, setLocalShares] = useState<Map<string, BankShare[]> | null>(null);

  const effectiveShares = localShares ?? shares ?? new Map<string, BankShare[]>();

  function countOf(topicId: string) {
    return counts.get(topicId) ?? { approved: 0, pending: 0 };
  }
  function totalOf(topicId: string) {
    const c = countOf(topicId);
    return c.approved + c.pending;
  }

  const examTotals = useMemo(() => {
    const map = new Map<string, number>();
    topics.forEach((t) => {
      const n = totalOf(t.id);
      examTagsOf(t).forEach((exam) => map.set(exam, (map.get(exam) ?? 0) + n));
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, counts]);

  const examOptions = useMemo(() => {
    const present = new Set(topics.flatMap(examTagsOf));
    const known = EXAM_ORDER.filter((e) => present.has(e));
    const extra = Array.from(present).filter((e) => e !== NO_EXAM_BUCKET && !EXAM_ORDER.includes(e)).sort((a, b) => a.localeCompare(b, "tr"));
    const other = present.has(NO_EXAM_BUCKET) ? [NO_EXAM_BUCKET] : [];
    return [...known, ...extra, ...other];
  }, [topics]);

  const activeExam = selectedExam ?? examOptions[0] ?? null;

  const gradesForExam = useMemo(() => {
    if (!activeExam) return [];
    const map = new Map<string, { key: string; count: number }>();
    topics.filter((t) => examTagsOf(t).includes(activeExam)).forEach((t) => {
      const key = gradeKeyOf(t);
      const entry = map.get(key) ?? { key, count: 0 };
      entry.count += totalOf(t.id);
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.key === NO_GRADE_BUCKET) return 1;
      if (b.key === NO_GRADE_BUCKET) return -1;
      return Number(a.key) - Number(b.key);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, activeExam, counts]);

  const activeGrade = selectedGrade ?? gradesForExam[0]?.key ?? null;

  const subjectsForExamGrade = useMemo(() => {
    if (!activeExam || !activeGrade) return [];
    const map = new Map<string, { id: string; name: string; count: number }>();
    topics
      .filter((t) => examTagsOf(t).includes(activeExam) && gradeKeyOf(t) === activeGrade)
      .forEach((t) => {
        const entry = map.get(t.subject_id) ?? { id: t.subject_id, name: t.subject_name, count: 0 };
        entry.count += totalOf(t.id);
        map.set(t.subject_id, entry);
      });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "tr"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, activeExam, activeGrade, counts]);

  const activeSubjectId = selectedSubjectId ?? subjectsForExamGrade[0]?.id ?? null;

  const topicsForSelection = useMemo(() => {
    if (!activeExam || !activeGrade || !activeSubjectId) return [];
    return topics.filter(
      (t) => examTagsOf(t).includes(activeExam) && gradeKeyOf(t) === activeGrade && t.subject_id === activeSubjectId
    );
  }, [topics, activeExam, activeGrade, activeSubjectId]);

  function pickExam(exam: string) {
    setSelectedExam(exam);
    setSelectedGrade(null);
    setSelectedSubjectId(null);
    setOpenTopicId(null);
  }
  function pickGrade(key: string) {
    setSelectedGrade(key);
    setSelectedSubjectId(null);
    setOpenTopicId(null);
  }
  function pickSubject(id: string) {
    setSelectedSubjectId(id);
    setOpenTopicId(null);
  }

  async function openTopic(topicId: string) {
    if (openTopicId === topicId) {
      setOpenTopicId(null);
      return;
    }
    setOpenTopicId(topicId);
    setLoadingTopic(true);
    const { data } = await supabase
      .from("questions")
      .select("id, body, options, correct_option, explanation, difficulty, is_approved, follows_new_policy")
      .eq("topic_id", topicId)
      .eq("is_reference_only", false)
      .order("created_at", { ascending: false });
    setTopicQuestions(
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
    setLoadingTopic(false);
  }

  function generateToken(): string {
    const rnd = () => crypto.randomUUID().replace(/-/g, "");
    return rnd() + rnd();
  }

  async function createShare(examType: string) {
    setShareBusy(true);
    const token = generateToken();
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("exam_shares")
      .insert({ exam_type: examType, token, created_by: userData.user?.id ?? null })
      .select("id, exam_type, token")
      .single();
    setShareBusy(false);
    if (!error && data) {
      setLocalShares((prev) => {
        const next = new Map<string, BankShare[]>(prev ?? shares ?? new Map());
        next.set(examType, [data as BankShare, ...(next.get(examType) ?? [])]);
        return next;
      });
    }
  }

  async function revokeShare(examType: string, shareId: string) {
    setShareBusy(true);
    await supabase.from("exam_shares").update({ revoked_at: new Date().toISOString() }).eq("id", shareId);
    setShareBusy(false);
    setLocalShares((prev) => {
      const next = new Map<string, BankShare[]>(prev ?? shares ?? new Map());
      next.set(examType, (next.get(examType) ?? []).filter((s) => s.id !== shareId));
      return next;
    });
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/paylasim/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((cur) => (cur === token ? null : cur)), 2000);
    });
  }

  if (topics.length === 0) {
    return <p className="text-sm text-slate-500">Henüz hiç konu (müfredat) eklenmemiş.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {examOptions.map((exam) => {
          const active = exam === activeExam;
          return (
            <button
              key={exam}
              type="button"
              onClick={() => pickExam(exam)}
              className={`touch-manipulation rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                active ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {exam} · {examTotals.get(exam) ?? 0}
            </button>
          );
        })}
      </div>

      {activeExam && (
        <>
          {canShare && (
            <div>
              <button
                type="button"
                onClick={() => setSharePanelExam((cur) => (cur === activeExam ? null : activeExam))}
                className="touch-manipulation text-xs font-medium text-indigo-600 hover:underline"
              >
                🔗 {activeExam} sınavını paylaş{(effectiveShares.get(activeExam) ?? []).length > 0 ? ` (${(effectiveShares.get(activeExam) ?? []).length})` : ""}
              </button>
              {sharePanelExam === activeExam && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                  {(effectiveShares.get(activeExam) ?? []).length > 0 && (
                    <ul className="mb-2 flex flex-col gap-1.5">
                      {(effectiveShares.get(activeExam) ?? []).map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-2 rounded-md bg-white p-2">
                          <span className="truncate text-slate-500">…/{s.token.slice(0, 10)}…</span>
                          <div className="flex shrink-0 items-center gap-2">
                            <button type="button" onClick={() => copyLink(s.token)} className="touch-manipulation font-medium text-indigo-600 hover:underline">
                              {copiedToken === s.token ? "Kopyalandı ✓" : "Linki kopyala"}
                            </button>
                            <button
                              type="button"
                              disabled={shareBusy}
                              onClick={() => revokeShare(activeExam, s.id)}
                              className="touch-manipulation font-medium text-red-600 hover:underline disabled:opacity-50"
                            >
                              İptal et
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    disabled={shareBusy}
                    onClick={() => createShare(activeExam)}
                    className="touch-manipulation rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {shareBusy ? "Oluşturuluyor…" : "Yeni bağlantı oluştur"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {gradesForExam.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => pickGrade(g.key)}
                className={`touch-manipulation rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  g.key === activeGrade ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {gradeLabel(g.key)} · {g.count}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {subjectsForExamGrade.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pickSubject(s.id)}
                className={`touch-manipulation rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  s.id === activeSubjectId ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {s.name} · {s.count}
              </button>
            ))}
          </div>

          <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {topicsForSelection.map((t) => {
              const c = countOf(t.id);
              const isOpen = openTopicId === t.id;
              return (
                <div key={t.id}>
                  <button
                    type="button"
                    onClick={() => openTopic(t.id)}
                    className="flex w-full touch-manipulation items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-800">{t.name}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                      {c.pending > 0 && <Badge tone="amber">{c.pending} bekliyor</Badge>}
                      <span className="font-semibold text-slate-700">{c.approved + c.pending} soru</span>
                      <span className="text-slate-300">{isOpen ? "▾" : "▸"}</span>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-3">
                      {loadingTopic ? (
                        <p className="text-xs text-slate-400">Yükleniyor…</p>
                      ) : topicQuestions.length === 0 ? (
                        <p className="text-xs text-slate-400">Bu konuda henüz soru yok.</p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {topicQuestions.map((q) => (
                            <li key={q.id} className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {q.follows_new_policy && <Badge tone="amber">*</Badge>}
                                <Badge tone={q.is_approved ? "green" : "amber"}>{q.is_approved ? "Onaylı" : "Onay bekliyor"}</Badge>
                              </div>
                              <p className="mt-1 text-slate-800">{q.body}</p>
                              <button
                                type="button"
                                onClick={() => setEditingId(editingId === q.id ? null : q.id)}
                                className="mt-1 touch-manipulation text-xs font-medium text-indigo-600 hover:underline"
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
            })}
            {topicsForSelection.length === 0 && <p className="px-3 py-3 text-xs text-slate-400">Bu ders/sınıf için henüz konu yok.</p>}
          </div>
        </>
      )}
    </div>
  );
}
