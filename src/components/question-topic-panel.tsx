"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button } from "@/components/ui";
import { ManualQuestionForm } from "@/components/manual-question-form";
import { BulkQuestionImport } from "@/components/bulk-question-import";
import { AiQuestionGenerate } from "@/components/ai-question-generate";
import { QuestionEditForm, type EditableQuestion } from "@/components/question-edit-form";
import { TopicExamShareRow, type ExamShare } from "@/components/exam-share-panel";

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

type RowSel = { type: "grade"; value: number } | { type: "exam"; value: string };

const DEFAULT_TARGET = 60;
const LOAD_LIMIT = 300;
const GRADE_ROWS = Array.from({ length: 12 }, (_, i) => i + 1);
// Anasayfadaki kanonik sinav sirasiyla ayni (bkz. reference-pool-browser.tsx
// EXAM_ORDER) - kullanicinin talebiyle bu satirlar sinif pillerinin SAGINDA,
// ayni satirda sirali gosteriliyor (ör. "12. Sınıf ... KPSS AYT YKS ...").
const EXAM_ROW_ORDER = ["BILSEM", "LGS", "TYT", "AYT", "YKS", "KPSS", "ALES"];

// "1. sinifa basinca fizik gorunmesin, her sinifin altinda olan dersler
// gorunsun" talebiyle - Ders secimi artik sistemdeki TUM dersleri degil,
// gercek Turkiye mufredatinda (MEB haftalik ders cizelgeleri, ttkb.meb.gov.tr
// kaynakli) o sinif/sinavda okutulan/sorulan dersleri gosteriyor. Isimler
// subjects tablosundaki gercek ders adlariyla BIREBIR eslesmeli - yeni bir
// ders (subjects tablosuna) eklenirse bu iki liste de guncellenmeli, yoksa
// o ders hicbir sinif/sinavin altinda gorunmez.
//
// Kaynak (MEB resmi haftalik ders cizelgeleri): Turkce 1-8. sinif (lisede
// "Turk Dili ve Edebiyati" adini alir, sistemde ayri ders olarak yok);
// Matematik 1-12 kesintisiz; Hayat Bilgisi 1-3. sinif; Fen Bilimleri 3-8.
// sinif (lisede Fizik/Kimya/Biyoloji'ye ayrilir); Sosyal Bilgiler 4-7.
// sinif (8. sinifta yerini tamamen T.C. Inkilap Tarihi ve Ataturkculuk'e
// birakiyor - 8. sinifta ayrica Sosyal Bilgiler dersi YOK); Yabanci Dil
// (Ingilizce) MEB devlet okullarinda resmi olarak 2. siniftan itibaren
// zorunlu, ancak ozel okul/kolejlerin buyuk cogunlugunda (ve kullanicinin
// talebiyle) 1. siniftan itibaren de okutuluyor - kullanicinin acik
// talebiyle 1. sinifa da eklendi; Din Kulturu ve Ahlak Bilgisi 4.
// siniftan itibaren kesintisiz (anayasal olarak 1-3. sinifta yok); T.C.
// Inkilap Tarihi ve Ataturkculuk SADECE 8. sinif (LGS dersi) ve lisede
// SADECE 11. sinifta okutuluyor; Fizik lisede 9-12 kesintisiz ortak ders.
const GRADE_SUBJECT_NAMES: Record<number, string[]> = {
  1: ["Türkçe", "Matematik", "Hayat Bilgisi", "İngilizce"],
  2: ["Türkçe", "Matematik", "Hayat Bilgisi", "İngilizce"],
  3: ["Türkçe", "Matematik", "Hayat Bilgisi", "İngilizce", "Fen Bilimleri"],
  4: ["Türkçe", "Matematik", "İngilizce", "Fen Bilimleri", "Sosyal Bilgiler", "Din Kültürü ve Ahlak Bilgisi"],
  5: ["Türkçe", "Matematik", "İngilizce", "Fen Bilimleri", "Sosyal Bilgiler", "Din Kültürü ve Ahlak Bilgisi"],
  6: ["Türkçe", "Matematik", "İngilizce", "Fen Bilimleri", "Sosyal Bilgiler", "Din Kültürü ve Ahlak Bilgisi"],
  7: ["Türkçe", "Matematik", "İngilizce", "Fen Bilimleri", "Sosyal Bilgiler", "Din Kültürü ve Ahlak Bilgisi"],
  8: [
    "Türkçe",
    "Matematik",
    "İngilizce",
    "Fen Bilimleri",
    "Din Kültürü ve Ahlak Bilgisi",
    "T.C. İnkılap Tarihi ve Atatürkçülük",
  ],
  9: ["Matematik", "İngilizce", "Fizik", "Din Kültürü ve Ahlak Bilgisi"],
  10: ["Matematik", "İngilizce", "Fizik", "Din Kültürü ve Ahlak Bilgisi"],
  11: ["Matematik", "İngilizce", "Fizik", "Din Kültürü ve Ahlak Bilgisi", "T.C. İnkılap Tarihi ve Atatürkçülük"],
  12: ["Matematik", "İngilizce", "Fizik", "Din Kültürü ve Ahlak Bilgisi"],
};

const EXAM_SUBJECT_NAMES: Record<string, string[]> = {
  // BILSEM sinavi ozellikle ilkokul (2-4. sinif) ogrencilerine uygulaniyor.
  BILSEM: ["Türkçe", "Matematik", "Fen Bilimleri", "Hayat Bilgisi"],
  // LGS (8. sinif merkezi sinavi, OSYM): Turkce, Matematik, Fen Bilimleri,
  // T.C. Inkilap Tarihi ve Ataturkculuk, Din Kulturu, Ingilizce - 6 ders.
  LGS: ["Türkçe", "Matematik", "Fen Bilimleri", "İngilizce", "Din Kültürü ve Ahlak Bilgisi", "T.C. İnkılap Tarihi ve Atatürkçülük"],
  // TYT: Turkce, Matematik, Fen Bilimleri (Fizik/Kimya/Biyoloji), Sosyal
  // Bilimler (Tarih/Cografya/Felsefe/Din Kulturu).
  TYT: ["Türkçe", "Matematik", "Fizik", "Fen Bilimleri", "Din Kültürü ve Ahlak Bilgisi"],
  // AYT: sayisal (Matematik, Fizik/Kimya/Biyoloji), esit agirlik/sozel ve
  // ayri bir oturum olarak Yabanci Dil testi de var.
  AYT: ["Matematik", "Fizik", "İngilizce"],
  // YKS, TYT+AYT'yi kapsayan sinav markasi - ikisinin birlestirilmis ders
  // kumesi.
  YKS: ["Türkçe", "Matematik", "Fizik", "Fen Bilimleri", "Din Kültürü ve Ahlak Bilgisi", "İngilizce"],
  // KPSS Genel Yetenek-Genel Kultur: Turkce, Matematik, Tarih (en yakini
  // T.C. Inkilap Tarihi ve Ataturkculuk).
  KPSS: ["Türkçe", "Matematik", "T.C. İnkılap Tarihi ve Atatürkçülük"],
  // ALES: sozel + sayisal akil yurutme, Turkce/Matematik agirlikli.
  ALES: ["Türkçe", "Matematik"],
};

function allowedSubjectNames(row: RowSel): string[] {
  return row.type === "grade" ? GRADE_SUBJECT_NAMES[row.value] ?? [] : EXAM_SUBJECT_NAMES[row.value] ?? [];
}

function rowMatches(row: RowSel, t: PanelTopic): boolean {
  return row.type === "grade" ? t.grade_level === row.value : (t.exam_types ?? []).includes(row.value);
}

function RowButton({
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

// Kullanicinin defalarca "olmadi, karisik oldu" dedigi sinif/sinav x ders
// matrisi tamamen terk edildi. Bunun yerine TEK bir konu seciliyor: once
// "sinif VEYA sinav" (ayni satirda, sinif pilleri 1-12, saginda sinav
// pilleri LGS/TYT/AYT/YKS/KPSS/ALES/BILSEM), sonra ders, sonra konu. Konu
// secilince o konunun sorulari, ekleme butonu, onay butonu VE (admin ise)
// o konunun bagli oldugu her sinav icin ayri bir paylas satiri ayni yerde
// gorunur.
export function QuestionTopicPanel({
  topics,
  counts,
  subjects,
  subjectIds,
  shares,
  isAdmin,
}: {
  topics: PanelTopic[];
  counts: Map<string, number>;
  /** Ders secimi artik sadece secili sinif/sinavda konusu olan degil, TUM
   * dersleri gosteriyor (kullanicinin "tum siniflarin derslerini soru
   * olmasa da ekle" talebi) - boylece henuz konu/soru girilmemis bir ders
   * de gorunur ve secilebilir kalir. */
  subjects: { id: string; name: string }[];
  subjectIds?: string[];
  /** Sadece admin: konu basina paylasim satirlari icin sinav -> mevcut linkler. */
  shares?: Map<string, ExamShare[]>;
  isAdmin: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  const [row, setRow] = useState<RowSel | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState("");
  const [questions, setQuestions] = useState<PanelQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const selectedTopic = topicId ? topicById.get(topicId) : undefined;

  // Secili sinif/sinavda henuz konusu/sorusu olmayan bir ders de listede
  // kalsin diye topics'e gore filtrelemiyoruz - ama GRADE_SUBJECT_NAMES/
  // EXAM_SUBJECT_NAMES'e gore o sinif/sinavda gercekten okutulan/sorulan
  // dersler disinda hicbir sey gosterilmiyor (ör. 1. sinifta Fizik yok).
  const subjectsForRow = useMemo(() => {
    if (!row) return [];
    const allowed = new Set(allowedSubjectNames(row));
    return subjects.filter((s) => allowed.has(s.name)).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [row, subjects]);

  const topicsForRowSubject = useMemo(() => {
    if (!row || !subjectId) return [];
    return topics.filter((t) => rowMatches(row, t) && t.subject_id === subjectId).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [row, subjectId, topics]);

  function pickRow(next: RowSel) {
    setRow(next);
    setSubjectId(null);
    setTopicId("");
    setQuestions([]);
    setAddOpen(false);
  }

  function pickSubject(id: string) {
    setSubjectId(id);
    setTopicId("");
    setQuestions([]);
    setAddOpen(false);
  }

  async function pickTopic(id: string) {
    setTopicId(id);
    setAddOpen(false);
    setEditingId(null);
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
  const examTypesOfTopic = selectedTopic?.exam_types ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Sınıf / Sınav</p>
        <div className="flex w-full max-w-full flex-wrap gap-1.5 overflow-x-hidden">
          {GRADE_ROWS.map((g) => (
            <RowButton key={`g-${g}`} active={!!row && row.type === "grade" && row.value === g} onClick={() => pickRow({ type: "grade", value: g })}>
              {g}. Sınıf
            </RowButton>
          ))}
          {EXAM_ROW_ORDER.map((e) => (
            <RowButton key={`e-${e}`} active={!!row && row.type === "exam" && row.value === e} onClick={() => pickRow({ type: "exam", value: e })}>
              {e}
            </RowButton>
          ))}
        </div>
      </div>

      {row && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Ders</p>
          {subjectsForRow.length === 0 ? (
            <p className="text-xs text-slate-500">Bu seçimde henüz konu yok.</p>
          ) : (
            <div className="flex w-full max-w-full flex-wrap gap-1.5 overflow-x-hidden">
              {subjectsForRow.map((s) => (
                <RowButton key={s.id} active={subjectId === s.id} onClick={() => pickSubject(s.id)}>
                  {s.name}
                </RowButton>
              ))}
            </div>
          )}
        </div>
      )}

      {row && subjectId && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Konu</p>
          {topicsForRowSubject.length === 0 ? (
            <p className="text-xs text-slate-500">Bu sınıf/ders için henüz konu yok.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {topicsForRowSubject.map((t) => {
                const topicAdded = counts.get(t.id) ?? 0;
                const topicTarget = t.target_question_count ?? DEFAULT_TARGET;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pickTopic(t.id)}
                    className={`touch-manipulation flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      topicId === t.id ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{t.name}</span>
                    <Badge tone={topicAdded >= topicTarget ? "green" : topicAdded > 0 ? "amber" : "default"}>
                      {topicAdded}/{topicTarget} soru
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

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

          {isAdmin && shares && examTypesOfTopic.length > 0 && (
            <div className="mb-4 flex flex-col gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Bu konunun sınavları</p>
              {examTypesOfTopic.map((exam) => (
                <TopicExamShareRow key={exam} examType={exam} initialShares={shares.get(exam) ?? []} />
              ))}
            </div>
          )}

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
