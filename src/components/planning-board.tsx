"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui";
import { DIFFICULTY_ORDER, DIFFICULTY_LABELS, type QuestionDifficulty } from "@/lib/questions/difficulty";

export type PlanningTopic = {
  id: string;
  name: string;
  grade_level: number | null;
  subject_id: string;
  subject_name: string;
  exam_types: string[] | null;
  target_question_count: number | null;
};

// Anasayfa/Soru Havuzu ile ayni kanonik sinav sirasi (bkz.
// lib/homepage-content.ts EXAM_COURSES, reference-pool-browser.tsx).
const EXAM_ORDER = ["LGS", "TYT", "AYT", "YKS", "KPSS", "ALES"];
const NO_EXAM_BUCKET = "Diğer";

// Admin henuz bir konuya ozel hedef girmediyse (target_question_count NULL)
// kullanilan varsayilan - kullanicinin "sen belirle" tercihine gore secildi:
// bir konuyu makul surede (birkac gunde) bitirilebilir, ama sinav bankasini
// da anlamli bicimde besleyecek orta bir sayi.
const DEFAULT_TARGET_PER_TOPIC = 60;

// question-generation.md/question-quality.md'deki zorluk dagilimina paralel,
// bilgilendirme amacli oneri yuzdeleri (kolay/orta/zor/cok_zor) - sadece
// hedefi kirmizi hatta kesin bir kurala baglamadan admin'e "60 hedefliyorsan
// yaklasik boyle dagit" fikrini vermek icin.
const DIFFICULTY_SPLIT: Record<QuestionDifficulty, number> = {
  kolay: 0.25,
  orta: 0.4,
  zor: 0.25,
  cok_zor: 0.1,
};

function splitSuggestion(target: number): string {
  return DIFFICULTY_ORDER.map((d) => `${Math.round(target * DIFFICULTY_SPLIT[d])} ${DIFFICULTY_LABELS[d].toLowerCase()}`).join(
    ", "
  );
}

function examTagsOf(t: PlanningTopic): string[] {
  return t.exam_types && t.exam_types.length > 0 ? t.exam_types : [NO_EXAM_BUCKET];
}

function gradeLabel(g: number | null): string {
  if (g == null) return "Genel";
  return `${g}. Sınıf`;
}

function ProgressBar({ done, target }: { done: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  const tone = pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-indigo-500" : pct > 0 ? "bg-amber-500" : "bg-slate-300";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Admin panelinin ilk giris ekrani: "sinav sinav / sinif sinif soru ekleme
// planlamasi" talebi uzerine kuruldu. Her konu icin bir hedef soru sayisi
// var (target_question_count, admin duzenleyebilir); "eklenen" ise
// questions tablosundaki gercek satirlardan (referans havuzu haric) canli
// hesaplaniyor. Kullanicinin "dengeli ilerleyelim, 1 ayda tum sinav/sinif/
// konulara elimizi degdirmis olalim" hedefine yardimci olmak icin her sinav
// ve ders altinda en geride kalan (en dusuk yuzdeli) konular basa siralaniyor
// - boylece "bugun 1-2 ders anca bitirebiliyorum" temposunda nereden devam
// edecegini hemen goruyor.
export function PlanningBoard({
  topics,
  questionCounts,
}: {
  topics: PlanningTopic[];
  questionCounts: Map<string, Partial<Record<QuestionDifficulty, number>>>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [overrides, setOverrides] = useState<Map<string, number>>(new Map());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  function targetOf(t: PlanningTopic): number {
    if (overrides.has(t.id)) return overrides.get(t.id)!;
    return t.target_question_count ?? DEFAULT_TARGET_PER_TOPIC;
  }

  function doneOf(t: PlanningTopic): number {
    const byDiff = questionCounts.get(t.id);
    if (!byDiff) return 0;
    return Object.values(byDiff).reduce((sum, n) => sum + (n ?? 0), 0);
  }

  async function saveTarget(topicId: string, value: number) {
    setOverrides((prev) => new Map(prev).set(topicId, value));
    setSavingId(topicId);
    await supabase
      .from("topics")
      .update({ target_question_count: value })
      .eq("id", topicId);
    setSavingId(null);
  }

  const examCounts = useMemo(() => {
    const map = new Map<string, { target: number; done: number; topicCount: number }>();
    topics.forEach((t) => {
      const target = targetOf(t);
      const done = doneOf(t);
      examTagsOf(t).forEach((exam) => {
        const entry = map.get(exam) ?? { target: 0, done: 0, topicCount: 0 };
        entry.target += target;
        entry.done += Math.min(done, target);
        entry.topicCount += 1;
        map.set(exam, entry);
      });
    });
    return map;
    // overrides degistiginde de yeniden hesaplanmali
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, questionCounts, overrides]);

  const examOptions = useMemo(() => {
    const present = Array.from(examCounts.keys());
    const known = EXAM_ORDER.filter((e) => present.includes(e));
    const extra = present.filter((e) => e !== NO_EXAM_BUCKET && !EXAM_ORDER.includes(e)).sort((a, b) => a.localeCompare(b, "tr"));
    const other = present.includes(NO_EXAM_BUCKET) ? [NO_EXAM_BUCKET] : [];
    return [...known, ...extra, ...other];
  }, [examCounts]);

  const activeExam = selectedExam ?? examOptions[0] ?? null;

  const subjectsForExam = useMemo(() => {
    if (!activeExam) return [];
    const bySubject = new Map<string, { id: string; name: string; target: number; done: number }>();
    topics
      .filter((t) => examTagsOf(t).includes(activeExam))
      .forEach((t) => {
        const target = targetOf(t);
        const done = doneOf(t);
        const entry = bySubject.get(t.subject_id) ?? { id: t.subject_id, name: t.subject_name, target: 0, done: 0 };
        entry.target += target;
        entry.done += Math.min(done, target);
        bySubject.set(t.subject_id, entry);
      });
    return Array.from(bySubject.values()).sort((a, b) => {
      const pctA = a.target > 0 ? a.done / a.target : 1;
      const pctB = b.target > 0 ? b.done / b.target : 1;
      return pctA - pctB || a.name.localeCompare(b.name, "tr");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, activeExam, questionCounts, overrides]);

  const activeSubjectId = selectedSubjectId ?? subjectsForExam[0]?.id ?? null;

  const topicsForExamSubject = useMemo(() => {
    if (!activeExam || !activeSubjectId) return [];
    return topics
      .filter((t) => examTagsOf(t).includes(activeExam) && t.subject_id === activeSubjectId)
      .sort((a, b) => {
        const pctA = targetOf(a) > 0 ? doneOf(a) / targetOf(a) : 1;
        const pctB = targetOf(b) > 0 ? doneOf(b) / targetOf(b) : 1;
        if (a.grade_level !== b.grade_level) return (a.grade_level ?? 99) - (b.grade_level ?? 99);
        return pctA - pctB;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, activeExam, activeSubjectId, questionCounts, overrides]);

  const grandTotal = useMemo(() => {
    let target = 0;
    let done = 0;
    topics.forEach((t) => {
      target += targetOf(t);
      done += Math.min(doneOf(t), targetOf(t));
    });
    return { target, done };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, questionCounts, overrides]);

  function pickExam(exam: string) {
    setSelectedExam(exam);
    setSelectedSubjectId(null);
  }

  if (topics.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        Henüz hiç konu (müfredat) eklenmemiş. Planlama yapabilmek için önce{" "}
        <Link href="/admin/sorular?tab=ekle" className="font-medium text-indigo-600 underline">
          Sorular → Soru Ekle → Müfredat/Konu Ekle
        </Link>{" "}
        sekmesinden sınav/sınıf/ders/konularını oluştur.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Genel ilerleme (tüm sınavlar)</p>
            <p className="text-xs text-slate-500">
              {grandTotal.done} / {grandTotal.target} soru — hedefe göre %
              {grandTotal.target > 0 ? Math.round((grandTotal.done / grandTotal.target) * 100) : 0}
            </p>
          </div>
          <span className="text-lg font-semibold text-slate-900">
            %{grandTotal.target > 0 ? Math.round((grandTotal.done / grandTotal.target) * 100) : 0}
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar done={grandTotal.done} target={grandTotal.target} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {examOptions.map((exam) => {
          const c = examCounts.get(exam)!;
          const pct = c.target > 0 ? Math.round((c.done / c.target) * 100) : 0;
          const active = exam === activeExam;
          return (
            <button
              key={exam}
              type="button"
              onClick={() => pickExam(exam)}
              className={`touch-manipulation rounded-xl border px-3 py-2 text-left text-xs transition ${
                active ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{exam}</span>
                <span className="text-slate-500">
                  %{pct} · {c.topicCount} konu
                </span>
              </div>
              <div className="mt-1 w-40">
                <ProgressBar done={c.done} target={c.target} />
              </div>
            </button>
          );
        })}
      </div>

      {activeExam && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {subjectsForExam.map((s) => {
              const pct = s.target > 0 ? Math.round((s.done / s.target) * 100) : 0;
              const active = s.id === activeSubjectId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSubjectId(s.id)}
                  className={`touch-manipulation rounded-full border px-3 py-1 text-xs font-medium transition ${
                    active ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {s.name} · %{pct}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-500">
            En geride kalan konular başta listelenir — dengeli ilerlemek için oradan devam edebilirsin.
          </p>

          <div className="flex flex-col divide-y divide-slate-100">
            {topicsForExamSubject.map((t) => {
              const target = targetOf(t);
              const done = doneOf(t);
              const remaining = Math.max(0, target - done);
              const byDiff = questionCounts.get(t.id) ?? {};
              return (
                <div key={t.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{t.name}</span>
                      <Badge tone="default">{gradeLabel(t.grade_level)}</Badge>
                      {remaining === 0 && target > 0 && <Badge tone="green">Hedef tamam</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {done} / {target} soru eklendi
                      {done > 0 && (
                        <>
                          {" "}
                          (
                          {DIFFICULTY_ORDER.filter((d) => (byDiff[d] ?? 0) > 0)
                            .map((d) => `${byDiff[d]} ${DIFFICULTY_LABELS[d].toLowerCase()}`)
                            .join(", ")}
                          )
                        </>
                      )}
                      {remaining > 0 && <> · kalan: {remaining} (öneri: {splitSuggestion(remaining)})</>}
                    </p>
                    <div className="mt-1 max-w-xs">
                      <ProgressBar done={done} target={target} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">
                      Hedef
                      <input
                        type="number"
                        min={0}
                        defaultValue={target}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isNaN(v) && v !== target) saveTarget(t.id, v);
                        }}
                        className="ml-1 w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900"
                      />
                    </label>
                    {savingId === t.id && <span className="text-xs text-slate-400">kaydediliyor…</span>}
                    <Link
                      href="/admin/sorular?tab=ekle"
                      className="touch-manipulation rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                    >
                      Soru Ekle
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
