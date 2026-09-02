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

export type BankQuestion = EditableQuestion & {
  topic_id: string;
  is_approved: boolean;
  follows_new_policy: boolean;
  created_at: string;
};

export type BankShare = { id: string; exam_type: string; token: string };

const EXAM_ORDER = ["BILSEM", "LGS", "TYT", "AYT", "YKS", "KPSS", "ALES"];
const NO_EXAM_BUCKET = "Diğer";

function examTagsOf(t: BankTopic): string[] {
  return t.exam_types && t.exam_types.length > 0 ? t.exam_types : [NO_EXAM_BUCKET];
}
function gradeLabel(g: number | null): string {
  return g == null ? "Genel" : `${g}. Sınıf`;
}

// Kullanicinin "sorularda ilk acilista mumkunse bir sey gosterme, sadece
// test sorulari ve cevaplari gelsin, paylasim secenegi de olsun" talebiyle
// - bu bilesen artik sinif/ders/konu piller/hiyerarsi GOSTERMIYOR. Sayfa
// acildiginda dogrudan (sunucudan onceden gelen, follows_new_policy=true
// olan - yani "*" ile isaretli yeni kural/test sorulari) sorularin kendisi
// ve cevaplari duz bir liste halinde goruluyor; her sorunun ustunde hangi
// sinif/ders/konuya ait oldugunu gosteren kucuk bir bilgi satiri var (tikla-
// goz-at bir gezinme degil, sadece baglam). "Eski sorulari da goster"
// checkbox'i acilirsa eski (follows_new_policy=false) sorular da AYRICA,
// SADECE O AN client tarafinda cekilip listeye eklenir (on binlerce soruya
// olceklensin diye hepsi bastan yuklenmiyor, bkz. LOAD_OLD_LIMIT).
const LOAD_OLD_LIMIT = 50;

export function QuestionBankBrowser({
  topics,
  newQuestions,
  shares,
  canShare,
}: {
  topics: BankTopic[];
  newQuestions: BankQuestion[];
  shares?: Map<string, BankShare[]>;
  canShare: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [showOld, setShowOld] = useState(false);
  const [oldQuestions, setOldQuestions] = useState<BankQuestion[] | null>(null);
  const [loadingOld, setLoadingOld] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shareExam, setShareExam] = useState<string>("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [localShares, setLocalShares] = useState<Map<string, BankShare[]> | null>(null);

  const effectiveShares = localShares ?? shares ?? new Map<string, BankShare[]>();
  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  async function toggleShowOld(checked: boolean) {
    setShowOld(checked);
    if (checked && oldQuestions === null) {
      setLoadingOld(true);
      const { data } = await supabase
        .from("questions")
        .select("id, body, options, correct_option, explanation, difficulty, topic_id, is_approved, follows_new_policy, created_at")
        .eq("is_reference_only", false)
        .eq("follows_new_policy", false)
        .order("created_at", { ascending: false })
        .limit(LOAD_OLD_LIMIT);
      setOldQuestions(
        ((data ?? []) as Record<string, unknown>[]).map((q) => ({
          id: q.id as string,
          body: q.body as string,
          options: (q.options ?? {}) as Record<string, string>,
          correct_option: q.correct_option as string,
          explanation: (q.explanation as string) ?? null,
          difficulty: q.difficulty as EditableQuestion["difficulty"],
          topic_id: q.topic_id as string,
          is_approved: !!q.is_approved,
          follows_new_policy: !!q.follows_new_policy,
          created_at: q.created_at as string,
        }))
      );
      setLoadingOld(false);
    }
  }

  const visibleQuestions = useMemo(() => {
    const list = showOld ? [...newQuestions, ...(oldQuestions ?? [])] : newQuestions;
    return [...list].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [newQuestions, oldQuestions, showOld]);

  const examOptions = useMemo(() => {
    const present = new Set(topics.flatMap(examTagsOf));
    present.delete(NO_EXAM_BUCKET);
    const known = EXAM_ORDER.filter((e) => present.has(e));
    const extra = Array.from(present).filter((e) => !EXAM_ORDER.includes(e)).sort((a, b) => a.localeCompare(b, "tr"));
    return [...known, ...extra];
  }, [topics]);

  function generateToken(): string {
    const rnd = () => crypto.randomUUID().replace(/-/g, "");
    return rnd() + rnd();
  }

  async function createShare(examType: string) {
    if (!examType) return;
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <input type="checkbox" checked={showOld} onChange={(e) => toggleShowOld(e.target.checked)} />
          Eski soruları da göster
        </label>

        {canShare && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShareOpen((v) => !v)}
              className="touch-manipulation text-xs font-medium text-indigo-600 hover:underline"
            >
              🔗 Sınav paylaş
            </button>
            {shareOpen && (
              <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
                <div className="mb-2 flex gap-1.5">
                  <select
                    value={shareExam}
                    onChange={(e) => setShareExam(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    <option value="">Sınav seç…</option>
                    {examOptions.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={shareBusy || !shareExam}
                    onClick={() => createShare(shareExam)}
                    className="touch-manipulation rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Yeni link
                  </button>
                </div>
                {shareExam && (effectiveShares.get(shareExam) ?? []).length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {(effectiveShares.get(shareExam) ?? []).map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 p-1.5">
                        <span className="truncate text-slate-500">…/{s.token.slice(0, 10)}…</span>
                        <div className="flex shrink-0 items-center gap-2">
                          <button type="button" onClick={() => copyLink(s.token)} className="touch-manipulation font-medium text-indigo-600 hover:underline">
                            {copiedToken === s.token ? "Kopyalandı ✓" : "Kopyala"}
                          </button>
                          <button
                            type="button"
                            disabled={shareBusy}
                            onClick={() => revokeShare(shareExam, s.id)}
                            className="touch-manipulation font-medium text-red-600 hover:underline disabled:opacity-50"
                          >
                            İptal
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {loadingOld && <p className="text-xs text-slate-400">Eski sorular yükleniyor…</p>}

      {visibleQuestions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          Henüz gösterilecek bir soru yok.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleQuestions.map((q) => {
            const topic = topicById.get(q.topic_id);
            return (
              <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                  {topic && (
                    <span>
                      {gradeLabel(topic.grade_level)} · {topic.subject_name} · {topic.name}
                    </span>
                  )}
                  {q.follows_new_policy && <Badge tone="amber">*</Badge>}
                  <Badge tone={q.is_approved ? "green" : "amber"}>{q.is_approved ? "Onaylı" : "Onay bekliyor"}</Badge>
                </div>
                <p className="font-medium text-slate-900">{q.body}</p>
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
