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
// konusu soru (bkz. kullanicinin talebi) ve bu ekran artik dogrudan soru
// akisina odaklaniyor. Admin tum sorulari (tum branslar) gorur, ogretmen
// sadece kendi branslarindakini (sayfa bilesenine zaten filtrelenmis
// sorular gelir). Duzeltme yetkisi: admin her soruyu, ogretmen ise sadece
// KENDI onayladigi soruyu duzenleyebilir.
export function RecentQuestionsCard({
  questions,
  isAdmin,
  currentUserId,
}: {
  questions: RecentQuestion[];
  isAdmin: boolean;
  currentUserId?: string | null;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  function canEdit(q: RecentQuestion) {
    return isAdmin || (!!currentUserId && q.approved_by === currentUserId);
  }

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-slate-900">Son Eklenen/Onaylanan Sorular</h2>
      <p className="mb-3 text-xs text-slate-500">
        {isAdmin
          ? "Tüm branşlardaki en son işlem gören 10 soru, tarihine göre sıralı."
          : "Branşındaki en son işlem gören 10 soru, tarihine göre sıralı."}
      </p>
      {questions.length === 0 && <p className="text-sm text-slate-500">Henüz soru yok.</p>}
      <ul className="flex flex-col divide-y divide-slate-100">
        {questions.map((q) => (
          <li key={q.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={q.is_approved ? "green" : "amber"}>{q.is_approved ? "Onaylandı" : "Yeni Eklendi"}</Badge>
              <Badge>{q.subject_name}</Badge>
              <Badge>{q.topic_name}</Badge>
              <span className="ml-auto text-xs text-slate-400">
                {new Date(q.sort_date).toLocaleDateString("tr-TR")}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-slate-800">{q.body}</p>
            {canEdit(q) && editingId !== q.id && (
              <button
                type="button"
                onClick={() => setEditingId(q.id)}
                className="mt-1.5 touch-manipulation text-xs font-medium text-indigo-600 hover:underline"
              >
                Düzenle
              </button>
            )}
            {editingId === q.id && <QuestionEditForm question={q} onDone={() => setEditingId(null)} />}
          </li>
        ))}
      </ul>
    </Card>
  );
}
