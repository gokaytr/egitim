"use client";

import { useState } from "react";
import { Card, Badge } from "@/components/ui";
import { QuestionEditForm, type EditableQuestion } from "@/components/question-edit-form";
import type { QuestionDifficulty } from "@/lib/questions/difficulty";

export type RecentQuestion = EditableQuestion & {
  is_approved: boolean;
  approved_by: string | null;
  created_by: string | null;
  sort_date: string;
  subject_name: string;
  topic_name: string;
  difficulty: QuestionDifficulty | null;
};

// Genel Bakis sayfasindaki "Son Eklenen/Onaylanan Sorular" karti - eskiden
// burada duran "Özel Ders Talepleri" kaldirildi, cunku sitenin en onemli
// konusu soru ve bu ekran artik dogrudan soru akisina odaklaniyor.
// Kullanicinin talebiyle "eklenen" ve "onaylanan" artik tek karma liste
// yerine iki ayri sekme - her satirda TEK soru, excel benzeri acik
// mavi/gri zebra desenli, goz yormayan kompakt bir gorunum. Admin her
// soruyu, ogretmen ise sadece KENDI onayladigi soruyu duzenleyebilir.
function QuestionRow({
  q,
  index,
  isAdmin,
  currentUserId,
  editingId,
  setEditingId,
}: {
  q: RecentQuestion;
  index: number;
  isAdmin: boolean;
  currentUserId?: string | null;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const canEdit = isAdmin || (!!currentUserId && q.approved_by === currentUserId);
  const isEditing = editingId === q.id;
  const zebra = index % 2 === 0 ? "bg-sky-50/70" : "bg-slate-50";

  return (
    <li className={zebra}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
        <span className="w-24 shrink-0 text-xs text-slate-400">{new Date(q.sort_date).toLocaleDateString("tr-TR")}</span>
        <Badge>{q.subject_name}</Badge>
        <Badge>{q.topic_name}</Badge>
        <span className="min-w-0 flex-1 truncate text-slate-800">{q.body}</span>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditingId(isEditing ? null : q.id)}
            className="shrink-0 touch-manipulation text-xs font-medium text-indigo-600 hover:underline"
          >
            {isEditing ? "Kapat" : "Düzenle"}
          </button>
        )}
      </div>
      {isEditing && (
        <div className="px-3 pb-3">
          <QuestionEditForm question={q} onDone={() => setEditingId(null)} />
        </div>
      )}
    </li>
  );
}

function RecentQuestionsList({
  questions,
  isAdmin,
  currentUserId,
  emptyText,
}: {
  questions: RecentQuestion[];
  isAdmin: boolean;
  currentUserId?: string | null;
  emptyText: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (questions.length === 0) {
    return <p className="px-1 py-2 text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <ul className="flex flex-col overflow-hidden rounded-lg border border-slate-100">
      {questions.map((q, i) => (
        <QuestionRow
          key={q.id}
          q={q}
          index={i}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          editingId={editingId}
          setEditingId={setEditingId}
        />
      ))}
    </ul>
  );
}

export function RecentQuestionsCard({
  added,
  approved,
  isAdmin,
  currentUserId,
}: {
  added: RecentQuestion[];
  approved: RecentQuestion[];
  isAdmin: boolean;
  currentUserId?: string | null;
}) {
  const [tab, setTab] = useState<"eklenen" | "onaylanan">("eklenen");

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-slate-900">Son Eklenen/Onaylanan Sorular</h2>
      <p className="mb-3 text-xs text-slate-500">
        {isAdmin ? "Tüm branşlardaki en son 10 soru, tarihine göre sıralı." : "Branşındaki en son 10 soru, tarihine göre sıralı."}
      </p>

      <div className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab("eklenen")}
          className={`flex-1 touch-manipulation rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "eklenen" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Son Eklenen
        </button>
        <button
          type="button"
          onClick={() => setTab("onaylanan")}
          className={`flex-1 touch-manipulation rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "onaylanan" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Son Onaylanan
        </button>
      </div>

      {tab === "eklenen" ? (
        <RecentQuestionsList
          questions={added}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          emptyText="Henüz eklenen soru yok."
        />
      ) : (
        <RecentQuestionsList
          questions={approved}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          emptyText="Henüz onaylanan soru yok."
        />
      )}
    </Card>
  );
}
