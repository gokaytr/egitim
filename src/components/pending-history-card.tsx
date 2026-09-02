"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/ui";

export type PendingTopic = { id: string; name: string; subjectName: string; recommended: boolean };

export type AttemptSummary = {
  id: string;
  finishedAt: string | null;
  title: string;
  kind: string;
  correct: number;
  wrong: number;
  empty: number;
  pct: number;
  redoHref: string | null;
};

// Genel Bakis'taki "Cozulen Test/Deneme" istatistik karti kaldirildi - onun
// yerine, "Cozulmesi Gerekenler" basliginin hemen yanina "Gecmis
// Sonuclarim" sekmesi eklendi. Boylece ogrenci ayri bir sekmeye/sayfaya
// gitmeden, ayni kart icinde hem cozmesi gereken konulari hem de bitirdigi
// test/denemelerin ozetini gorebiliyor. Tum gecmisi gormek isteyenler icin
// yine de /ogrenci/gecmis sayfasina baglanti veriliyor.
export function PendingHistoryCard({
  pendingTopics,
  attempts,
}: {
  pendingTopics: PendingTopic[];
  attempts: AttemptSummary[];
}) {
  const [tab, setTab] = useState<"pending" | "history">("pending");

  return (
    <Card>
      <div className="mb-3 flex items-center gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={`-mb-px rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold transition ${
            tab === "pending" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Çözülmesi Gerekenler
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`-mb-px rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold transition ${
            tab === "history" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Geçmiş Sonuçlarım
        </button>
      </div>

      {tab === "pending" ? (
        pendingTopics.length === 0 ? (
          <p className="text-sm text-slate-600">Harika, sınıfına ait tüm konuları bitirmişsin! 🎉</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">Sınıfına ait henüz hiç bitirmediğin konular.</p>
            <ul className="flex flex-col gap-2">
              {pendingTopics.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-base">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-800">{t.name}</span>
                    {t.subjectName && <span className="text-sm text-slate-400">{t.subjectName}</span>}
                    {t.recommended && <Badge tone="amber">Seviye Tespit Önerisi</Badge>}
                  </div>
                  <Link href={`/ogrenci/konu/${t.id}`} className="font-medium text-indigo-600 underline">
                    Çöz →
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )
      ) : attempts.length === 0 ? (
        <p className="text-sm text-slate-600">Henüz bitirdiğin bir test veya deneme yok.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {attempts.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <Link href={`/ogrenci/gecmis/${a.id}`} className="flex items-center gap-2 hover:underline">
                  <Badge tone="default">{a.kind}</Badge>
                  <span className="text-slate-800">{a.title}</span>
                  <span className="text-xs text-slate-400">
                    {a.finishedAt ? new Date(a.finishedAt).toLocaleDateString("tr-TR") : ""}
                  </span>
                </Link>
                <span className="flex items-center gap-3">
                  <Badge tone={a.pct >= 80 ? "green" : a.pct >= 50 ? "amber" : "red"}>%{a.pct}</Badge>
                  <Link href={`/ogrenci/gecmis/${a.id}`} className="font-medium text-indigo-600 underline">
                    İncele →
                  </Link>
                  {a.redoHref && (
                    <Link href={a.redoHref} className="font-medium text-emerald-600 underline">
                      Tekrar Çöz ↻
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/ogrenci/gecmis" className="mt-3 inline-block text-sm font-medium text-indigo-600 underline">
            Tümünü gör →
          </Link>
        </>
      )}
    </Card>
  );
}
