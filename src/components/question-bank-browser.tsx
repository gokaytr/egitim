"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button } from "@/components/ui";
import { QuestionEditForm, type EditableQuestion } from "@/components/question-edit-form";
import { QuestionAddScreen } from "@/components/question-add-screen";
import { ReferencePoolAddPanel } from "@/components/reference-pool-add-panel";

export type BankTopic = {
  id: string;
  name: string;
  grade_level: number | null;
  subject_id: string;
  subject_name: string;
  exam_types: string[] | null;
  target_question_count: number | null;
};

export type BankQuestion = EditableQuestion & {
  topic_id: string;
  is_approved: boolean;
  follows_new_policy: boolean;
  created_at: string;
};

export type BankShare = { id: string; exam_type: string; token: string };

// Kullanicinin gonderdigi ornek tabloya ("Sorular Açılış sayfası.xlsx")
// gore: satirlar 1-12. sinif + sinav turleri (bir konu ayni anda hem bir
// sinifa hem bir/birden fazla sinava ait olabilir - ayni soru bu yuzden
// birden fazla satirda sayilabilir, bu KASITLI, "onun ayiklamasini sen yap"
// talebiyle boyle tasarlandi), en altta (sadece admin icin) tek bir "Soru
// Havuzu" satiri, sutunlar dersler. "Soru Ekle" ve "Soru Onayla" artik ayri
// sekmeler DEGIL - bir hucreye tiklaninca acilan panelde soru listesi,
// onayla butonu ve "+ Soru Ekle" (QuestionAddScreen/ReferencePoolAddPanel,
// oldugu gibi tekrar kullanilir) bulunuyor. Kullanicinin acik talebiyle
// ("soru ekle ve soru onayla mantigini tamamen sil... o excel goruntusu
// uzerinden ilerleyerek yapalim, basitlestir") eski sekmeli yapi tamamen
// kaldirildi.
const EXAM_ROWS = ["BILSEM", "LGS", "TYT", "AYT", "YKS", "KPSS", "ALES"];
const GRADE_ROWS = Array.from({ length: 12 }, (_, i) => i + 1);
const DEFAULT_TARGET_PER_TOPIC = 60;
const LOAD_QUESTIONS_LIMIT = 300;
const HAVUZ_ROW_KEY = "havuz";

type GridRow = { key: string; label: string; isHavuz?: boolean; match: (t: BankTopic) => boolean };

function buildRows(canManageHavuz: boolean): GridRow[] {
  const gradeRows: GridRow[] = GRADE_ROWS.map((g) => ({
    key: `g-${g}`,
    label: `${g}. Sınıf`,
    match: (t) => t.grade_level === g,
  }));
  const examRows: GridRow[] = EXAM_ROWS.map((e) => ({
    key: `e-${e}`,
    label: e,
    match: (t) => (t.exam_types ?? []).includes(e),
  }));
  const rows = [...gradeRows, ...examRows];
  if (canManageHavuz) {
    rows.push({ key: HAVUZ_ROW_KEY, label: "Soru Havuzu", isHavuz: true, match: () => true });
  }
  return rows;
}

export function QuestionBankBrowser({
  topics,
  counts,
  havuzCounts,
  shares,
  isAdmin,
}: {
  topics: BankTopic[];
  counts: Map<string, number>;
  havuzCounts?: Map<string, number>;
  shares?: Map<string, BankShare[]>;
  isAdmin: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [selected, setSelected] = useState<{ key: string; label: string; column: string; topicIds: string[]; isHavuz: boolean } | null>(
    null
  );
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [shareExam, setShareExam] = useState<string>("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [localShares, setLocalShares] = useState<Map<string, BankShare[]> | null>(null);

  const effectiveShares = localShares ?? shares ?? new Map<string, BankShare[]>();
  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);
  const rows = useMemo(() => buildRows(isAdmin), [isAdmin]);
  const columns = useMemo(
    () => Array.from(new Set(topics.map((t) => t.subject_name))).sort((a, b) => a.localeCompare(b, "tr")),
    [topics]
  );

  const cellIndex = useMemo(() => {
    const map = new Map<string, { topicIds: string[]; added: number; target: number }>();
    for (const row of rows) {
      for (const col of columns) {
        const matching = topics.filter((t) => t.subject_name === col && row.match(t));
        if (matching.length === 0) continue;
        const countsMap = row.isHavuz ? havuzCounts : counts;
        const added = matching.reduce((sum, t) => sum + (countsMap?.get(t.id) ?? 0), 0);
        const target = row.isHavuz
          ? 0
          : matching.reduce((sum, t) => sum + (t.target_question_count ?? DEFAULT_TARGET_PER_TOPIC), 0);
        map.set(`${row.key}|${col}`, { topicIds: matching.map((t) => t.id), added, target });
      }
    }
    return map;
  }, [rows, columns, topics, counts, havuzCounts]);

  const examOptions = useMemo(() => {
    const present = new Set(topics.flatMap((t) => t.exam_types ?? []));
    return EXAM_ROWS.filter((e) => present.has(e));
  }, [topics]);

  async function openCell(row: GridRow, column: string, topicIds: string[]) {
    if (topicIds.length === 0) return;
    if (selected?.key === row.key && selected.column === column) {
      setSelected(null);
      return;
    }
    setSelected({ key: row.key, label: row.label, column, topicIds, isHavuz: !!row.isHavuz });
    setAddOpen(false);
    setLoadingQuestions(true);
    const { data } = await supabase
      .from("questions")
      .select("id, body, options, correct_option, explanation, difficulty, topic_id, is_approved, follows_new_policy, created_at")
      .in("topic_id", topicIds)
      .eq("is_reference_only", !!row.isHavuz)
      .order("created_at", { ascending: false })
      .limit(LOAD_QUESTIONS_LIMIT);
    setQuestions(
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
    setLoadingQuestions(false);
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

  if (columns.length === 0) {
    return <p className="text-sm text-slate-500">Henüz hiç konu (müfredat) eklenmemiş.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {isAdmin && (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Bir sınav türünü dışarıyla, giriş gerektirmeyen gizli bir linkle paylaş.</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={shareExam}
              onChange={(e) => setShareExam(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
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
              className="touch-manipulation rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Yeni link
            </button>
            <button
              type="button"
              onClick={() => setShareOpen((v) => !v)}
              className="touch-manipulation text-xs font-medium text-indigo-600 hover:underline"
            >
              {shareOpen ? "Linkleri gizle" : "Linkleri göster"}
            </button>
          </div>
          {shareOpen && shareExam && (
            <div className="w-full border-t border-slate-100 pt-2 sm:col-span-2">
              {(effectiveShares.get(shareExam) ?? []).length === 0 ? (
                <p className="text-xs text-slate-400">Bu sınav için henüz link yok.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {(effectiveShares.get(shareExam) ?? []).map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 p-1.5 text-xs">
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

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 bg-slate-50 px-2 py-2 text-left font-semibold text-slate-500">
                &nbsp;
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="sticky top-0 z-10 whitespace-nowrap border-l border-slate-100 bg-slate-50 px-2 py-2 text-left font-semibold text-slate-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className={row.isHavuz ? "border-t-2 border-slate-300 bg-violet-50/40" : ""}>
                <td className="sticky left-0 z-10 whitespace-nowrap border-t border-slate-100 bg-white px-2 py-1.5 font-medium text-slate-700">
                  {row.label}
                </td>
                {columns.map((col) => {
                  const cell = cellIndex.get(`${row.key}|${col}`);
                  const isSelected = selected?.key === row.key && selected.column === col;
                  if (!cell) {
                    return <td key={col} className="border-l border-t border-slate-100 px-2 py-1.5" />;
                  }
                  const ratio = cell.target > 0 ? cell.added / cell.target : 0;
                  const tone = row.isHavuz
                    ? "bg-violet-50 text-violet-700"
                    : ratio >= 1
                      ? "bg-emerald-50 text-emerald-700"
                      : ratio > 0
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-50 text-slate-500";
                  return (
                    <td key={col} className="border-l border-t border-slate-100 p-0.5">
                      <button
                        type="button"
                        onClick={() => openCell(row, col, cell.topicIds)}
                        className={`touch-manipulation w-full rounded-md px-2 py-1.5 text-left font-medium transition hover:opacity-80 ${tone} ${
                          isSelected ? "ring-2 ring-indigo-400" : ""
                        }`}
                      >
                        {row.isHavuz ? cell.added : `${cell.added}/${cell.target}`}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">
              {selected.label} · {selected.column}
              {selected.isHavuz && <Badge tone="violet">Soru Havuzu</Badge>}
            </p>
            <Button variant="secondary" onClick={() => setAddOpen((v) => !v)}>
              {addOpen ? "Kapat" : "+ Soru Ekle"}
            </Button>
          </div>

          {addOpen && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              {selected.isHavuz ? <ReferencePoolAddPanel /> : <QuestionAddScreen showAiTab={isAdmin} />}
            </div>
          )}

          {loadingQuestions ? (
            <p className="text-xs text-slate-400">Yükleniyor…</p>
          ) : questions.length === 0 ? (
            <p className="text-xs text-slate-400">Bu kombinasyonda henüz soru yok.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {questions.map((q) => {
                const topic = topicById.get(q.topic_id);
                return (
                  <li key={q.id} className="rounded-lg border border-slate-200 p-2.5 text-sm">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                      {topic && <span>{topic.name}</span>}
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
      )}
    </div>
  );
}
