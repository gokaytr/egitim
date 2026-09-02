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

export type ExamShare = {
  id: string;
  exam_type: string;
  token: string;
  label: string | null;
  created_at: string;
};

// Anasayfa/Soru Havuzu ile ayni kanonik sinav sirasi (bkz.
// lib/homepage-content.ts EXAM_COURSES, reference-pool-browser.tsx).
// BILSEM, kullanicinin "bilsem sinavini da ekle" talebiyle eklendi (bkz.
// migration 0029 - exam_target enum'una BILSEM degeri eklendi).
const EXAM_ORDER = ["BILSEM", "LGS", "TYT", "AYT", "YKS", "KPSS", "ALES"];
const NO_EXAM_BUCKET = "Diğer";
const NO_GRADE_BUCKET = "Genel";

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

function gradeKeyOf(t: PlanningTopic): string {
  return t.grade_level == null ? NO_GRADE_BUCKET : String(t.grade_level);
}

function gradeLabel(key: string): string {
  return key === NO_GRADE_BUCKET ? NO_GRADE_BUCKET : `${key}. Sınıf`;
}

function pctOf(done: number, target: number): number {
  return target > 0 ? Math.round((done / target) * 100) : 0;
}

function ProgressBar({ done, target, thick = false }: { done: number; target: number; thick?: boolean }) {
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  const tone = pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-indigo-500" : pct > 0 ? "bg-amber-500" : "bg-slate-300";
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-100 ${thick ? "h-3" : "h-1.5"}`}>
      <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Sinav/sinif/ders kademelerinin ucunde de ayni gorsel dili kullanan tek bir
// "kutu" bileseni - kullanicinin "yuzdeler ayni sekilde gorunsun, daha
// profesyonel olsun" talebiyle, eskiden sinav kartlari buyuk kutu, sinif/
// ders ise kucuk yuvarlak pillerdi; artik ucu de ayni kart deseni, sadece
// boyutu (size) degisiyor.
function PlanningTile({
  title,
  pct,
  subtitle,
  done,
  target,
  active,
  onClick,
  size = "md",
}: {
  title: string;
  pct: number;
  subtitle: string;
  done: number;
  target: number;
  active: boolean;
  onClick: () => void;
  size?: "lg" | "md";
}) {
  const isLg = size === "lg";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`touch-manipulation rounded-2xl border text-left transition ${isLg ? "p-5" : "p-3"} ${
        active ? "border-indigo-500 bg-indigo-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-bold text-slate-900 ${isLg ? "text-xl" : "text-sm"}`}>{title}</span>
        <span className={`font-bold text-slate-900 ${isLg ? "text-2xl" : "text-base"}`}>%{pct}</span>
      </div>
      <p className={`mt-1 text-slate-500 ${isLg ? "text-sm" : "text-xs"}`}>{subtitle}</p>
      <div className={isLg ? "mt-3" : "mt-2"}>
        <ProgressBar done={done} target={target} thick={isLg} />
      </div>
    </button>
  );
}

// Admin panelinin ilk giris ekrani: "sinav sinav / sinif sinif soru ekleme
// planlamasi" talebi uzerine kuruldu. Her konu icin bir hedef soru sayisi
// var (target_question_count, admin duzenleyebilir); "eklenen" ise
// questions tablosundaki gercek satirlardan (referans havuzu haric) canli
// hesaplaniyor. Hiyerarsi sinav -> sinif -> ders -> konu seklinde (KPSS/ALES
// gibi sinifa bagli olmayan sinavlarda "Genel" tek kova olarak calisir).
// Kullanicinin "dengeli ilerleyelim" hedefine yardimci olmak icin her
// kademede en geride kalan (en dusuk yuzdeli) secenekler basa siralaniyor.
// Ayrica admin bir sinavi "Paylas" butonuyla gizli bir token linki ile
// disariya (girissiz, sadece linki bilen) acabilir - bkz. exam_shares
// tablosu, /paylasim/[token] sayfasi.
export function PlanningBoard({
  topics,
  questionCounts,
  shares,
}: {
  topics: PlanningTopic[];
  questionCounts: Map<string, Partial<Record<QuestionDifficulty, number>>>;
  shares: Map<string, ExamShare[]>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [overrides, setOverrides] = useState<Map<string, number>>(new Map());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [sharePanelExam, setSharePanelExam] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [localShares, setLocalShares] = useState<Map<string, ExamShare[]> | null>(null);

  const effectiveShares = localShares ?? shares;

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

  function generateToken(): string {
    // Tahmin edilemez, uzun (64 hex karakter, ~256 bit) bir paylasim
    // token'i - link'i sadece kimin bildiği görebilsin diye.
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
      .select("id, exam_type, token, label, created_at")
      .single();
    setShareBusy(false);
    if (!error && data) {
      setLocalShares((prev) => {
        const next = new Map(prev ?? shares);
        next.set(examType, [data as ExamShare, ...(next.get(examType) ?? [])]);
        return next;
      });
    }
  }

  async function revokeShare(examType: string, shareId: string) {
    setShareBusy(true);
    await supabase.from("exam_shares").update({ revoked_at: new Date().toISOString() }).eq("id", shareId);
    setShareBusy(false);
    setLocalShares((prev) => {
      const next = new Map(prev ?? shares);
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

  const examCounts = useMemo(() => {
    const map = new Map<string, { target: number; done: number; topicCount: number; gradeCount: number }>();
    topics.forEach((t) => {
      const target = targetOf(t);
      const done = doneOf(t);
      examTagsOf(t).forEach((exam) => {
        const entry = map.get(exam) ?? { target: 0, done: 0, topicCount: 0, gradeCount: 0 };
        entry.target += target;
        entry.done += Math.min(done, target);
        entry.topicCount += 1;
        map.set(exam, entry);
      });
    });
    // her sinav icin kac farkli sinif kademesi var (buyuk kartta gostermek icin)
    map.forEach((entry, exam) => {
      const grades = new Set<string>();
      topics.forEach((t) => {
        if (examTagsOf(t).includes(exam)) grades.add(gradeKeyOf(t));
      });
      entry.gradeCount = grades.size;
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

  const gradesForExam = useMemo(() => {
    if (!activeExam) return [];
    const byGrade = new Map<string, { key: string; target: number; done: number; topicCount: number }>();
    topics
      .filter((t) => examTagsOf(t).includes(activeExam))
      .forEach((t) => {
        const key = gradeKeyOf(t);
        const target = targetOf(t);
        const done = doneOf(t);
        const entry = byGrade.get(key) ?? { key, target: 0, done: 0, topicCount: 0 };
        entry.target += target;
        entry.done += Math.min(done, target);
        entry.topicCount += 1;
        byGrade.set(key, entry);
      });
    return Array.from(byGrade.values()).sort((a, b) => {
      if (a.key === NO_GRADE_BUCKET) return 1;
      if (b.key === NO_GRADE_BUCKET) return -1;
      return Number(a.key) - Number(b.key);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, activeExam, questionCounts, overrides]);

  const activeGrade = selectedGrade ?? gradesForExam[0]?.key ?? null;

  const subjectsForExamGrade = useMemo(() => {
    if (!activeExam || !activeGrade) return [];
    const bySubject = new Map<string, { id: string; name: string; target: number; done: number }>();
    topics
      .filter((t) => examTagsOf(t).includes(activeExam) && gradeKeyOf(t) === activeGrade)
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
  }, [topics, activeExam, activeGrade, questionCounts, overrides]);

  const activeSubjectId = selectedSubjectId ?? subjectsForExamGrade[0]?.id ?? null;

  const topicsForSelection = useMemo(() => {
    if (!activeExam || !activeGrade || !activeSubjectId) return [];
    return topics
      .filter(
        (t) => examTagsOf(t).includes(activeExam) && gradeKeyOf(t) === activeGrade && t.subject_id === activeSubjectId
      )
      .sort((a, b) => {
        const pctA = targetOf(a) > 0 ? doneOf(a) / targetOf(a) : 1;
        const pctB = targetOf(b) > 0 ? doneOf(b) / targetOf(b) : 1;
        return pctA - pctB;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, activeExam, activeGrade, activeSubjectId, questionCounts, overrides]);

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
    setSelectedGrade(null);
    setSelectedSubjectId(null);
  }

  function pickGrade(key: string) {
    setSelectedGrade(key);
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
              {grandTotal.done} / {grandTotal.target} soru — hedefe göre %{pctOf(grandTotal.done, grandTotal.target)}
            </p>
          </div>
          <span className="text-lg font-semibold text-slate-900">%{pctOf(grandTotal.done, grandTotal.target)}</span>
        </div>
        <div className="mt-2">
          <ProgressBar done={grandTotal.done} target={grandTotal.target} />
        </div>
      </div>

      {/* DÜZLEM 1: Sınavlar - büyük kartlar, her birinde ayrıca "Paylaş" aksiyonu var */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Sınav</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {examOptions.map((exam) => {
            const c = examCounts.get(exam)!;
            const pct = pctOf(c.done, c.target);
            const active = exam === activeExam;
            const activeShares = (effectiveShares.get(exam) ?? []).filter((s) => s);
            return (
              <div
                key={exam}
                className={`flex flex-col gap-3 rounded-2xl border p-5 transition ${
                  active ? "border-indigo-500 bg-indigo-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <button type="button" onClick={() => pickExam(exam)} className="touch-manipulation text-left">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xl font-bold text-slate-900">{exam}</span>
                    <span className="text-2xl font-bold text-slate-900">%{pct}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {c.done} / {c.target} soru · {c.topicCount} konu
                    {c.gradeCount > 1 ? ` · ${c.gradeCount} sınıf` : ""}
                  </p>
                  <div className="mt-3">
                    <ProgressBar done={c.done} target={c.target} thick />
                  </div>
                </button>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    onClick={() => setSharePanelExam((cur) => (cur === exam ? null : exam))}
                    className="touch-manipulation text-xs font-medium text-indigo-600 hover:underline"
                  >
                    🔗 Paylaş{activeShares.length > 0 ? ` (${activeShares.length})` : ""}
                  </button>
                </div>

                {sharePanelExam === exam && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                    <p className="mb-2 text-slate-600">
                      Bu bağlantıyı bilen herkes (giriş yapmadan) <strong>{exam}</strong> sınavındaki tüm onaylı
                      soruları cevap/açıklamalarıyla görebilir. Sadece paylaştığın kişiye ilet.
                    </p>
                    {activeShares.length > 0 && (
                      <ul className="mb-2 flex flex-col gap-1.5">
                        {activeShares.map((s) => (
                          <li key={s.id} className="flex items-center justify-between gap-2 rounded-md bg-white p-2">
                            <span className="truncate text-slate-500">…/{s.token.slice(0, 10)}…</span>
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => copyLink(s.token)}
                                className="touch-manipulation font-medium text-indigo-600 hover:underline"
                              >
                                {copiedToken === s.token ? "Kopyalandı ✓" : "Linki kopyala"}
                              </button>
                              <button
                                type="button"
                                disabled={shareBusy}
                                onClick={() => revokeShare(exam, s.id)}
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
                      onClick={() => createShare(exam)}
                      className="touch-manipulation rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {shareBusy ? "Oluşturuluyor…" : "Yeni bağlantı oluştur"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {activeExam && (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4">
          {/* DÜZLEM 2: Sınıflar - ayrı bir bölge, sınav kartlarıyla aynı görsel dilde ama küçük */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Sınıf</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {gradesForExam.map((g) => (
                <PlanningTile
                  key={g.key}
                  title={gradeLabel(g.key)}
                  pct={pctOf(g.done, g.target)}
                  subtitle={`${g.topicCount} konu`}
                  done={g.done}
                  target={g.target}
                  active={g.key === activeGrade}
                  onClick={() => pickGrade(g.key)}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Ders</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {subjectsForExamGrade.map((s) => (
                <PlanningTile
                  key={s.id}
                  title={s.name}
                  pct={pctOf(s.done, s.target)}
                  subtitle="konu ilerlemesi"
                  done={s.done}
                  target={s.target}
                  active={s.id === activeSubjectId}
                  onClick={() => setSelectedSubjectId(s.id)}
                />
              ))}
              {subjectsForExamGrade.length === 0 && (
                <p className="col-span-full text-xs text-slate-400">Bu sınıfta henüz bu sınava atanmış ders/konu yok.</p>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            En geride kalan konular başta listelenir — dengeli ilerlemek için oradan devam edebilirsin.
          </p>

          <div className="flex flex-col divide-y divide-slate-100">
            {topicsForSelection.map((t) => {
              const target = targetOf(t);
              const done = doneOf(t);
              const remaining = Math.max(0, target - done);
              const byDiff = questionCounts.get(t.id) ?? {};
              return (
                <div key={t.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{t.name}</span>
                      <span className="text-sm font-bold text-slate-900">%{pctOf(done, target)}</span>
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
            {topicsForSelection.length === 0 && (
              <p className="py-2 text-xs text-slate-400">Bu ders/sınıf için henüz konu yok.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
