"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ExamShare = { id: string; exam_type: string; token: string };

// Admin'in bir sinav turunu disariya, giris gerektirmeyen gizli bir linkle
// paylasmasi icin sade, normal akista duran bir kutu. Eskiden bu panel
// "position: absolute" ile tablonun ustune biniyordu (kullanicinin
// sikayeti) - artik sayfanin normal akisinda, sabit yukseklikte, kendi
// basina duran bir kart.
export function ExamSharePanel({
  examOptions,
  shares,
}: {
  examOptions: string[];
  shares: Map<string, ExamShare[]>;
}) {
  const [selectedExam, setSelectedExam] = useState("");
  const [localShares, setLocalShares] = useState<Map<string, ExamShare[]> | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const effectiveShares = localShares ?? shares;

  function generateToken(): string {
    const rnd = () => crypto.randomUUID().replace(/-/g, "");
    return rnd() + rnd();
  }

  async function createShare() {
    if (!selectedExam) return;
    setBusy(true);
    const supabase = createClient();
    const token = generateToken();
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("exam_shares")
      .insert({ exam_type: selectedExam, token, created_by: userData.user?.id ?? null })
      .select("id, exam_type, token")
      .single();
    setBusy(false);
    if (!error && data) {
      setLocalShares((prev) => {
        const next = new Map<string, ExamShare[]>(prev ?? shares);
        next.set(selectedExam, [data as ExamShare, ...(next.get(selectedExam) ?? [])]);
        return next;
      });
    }
  }

  async function revokeShare(shareId: string) {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("exam_shares").update({ revoked_at: new Date().toISOString() }).eq("id", shareId);
    setBusy(false);
    setLocalShares((prev) => {
      const next = new Map<string, ExamShare[]>(prev ?? shares);
      next.set(selectedExam, (next.get(selectedExam) ?? []).filter((s) => s.id !== shareId));
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

  if (examOptions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-sm font-semibold text-slate-800">Sınav Paylaş</p>
      <p className="mb-2 text-xs text-slate-500">
        Bir sınav türünü dışarıyla, giriş gerektirmeyen gizli bir linkle paylaş — link o sınavın son 5 sorusunu
        önizleme olarak gösterir.
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
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
          disabled={busy || !selectedExam}
          onClick={createShare}
          className="touch-manipulation rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Yeni link
        </button>
      </div>

      {selectedExam && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          {(effectiveShares.get(selectedExam) ?? []).length === 0 ? (
            <p className="text-xs text-slate-400">Bu sınav için henüz link yok.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {(effectiveShares.get(selectedExam) ?? []).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 p-1.5 text-xs">
                  <span className="truncate text-slate-500">…/{s.token.slice(0, 10)}…</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => copyLink(s.token)} className="touch-manipulation font-medium text-indigo-600 hover:underline">
                      {copiedToken === s.token ? "Kopyalandı ✓" : "Kopyala"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => revokeShare(s.id)}
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
  );
}
