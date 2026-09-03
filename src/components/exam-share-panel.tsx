"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ExamShare = { id: string; exam_type: string; token: string };

function generateToken(): string {
  const rnd = () => crypto.randomUUID().replace(/-/g, "");
  return rnd() + rnd();
}

// Kullanicinin somut ornegiyle ("7. sinif matematik problemler konusuna
// basilinca 3 tane sinav cikiyor, en saginda paylas butonu olsun") sinav
// paylasimi artik ayri, konudan bagimsiz bir kutu degil - bir konu
// secildiginde, o konunun bagli oldugu HER sinav turu icin (bir konu
// birden fazla sinava etiketlenmis olabilir) ayri bir satir gosteriliyor,
// en saginda "Paylas" butonuyla. Buton ilk tiklamada (o sinav icin henuz
// aktif link yoksa) hemen bir link olusturup aciyor; sonraki tiklamalar
// sadece ac/kapa yapiyor, icinde ek link olusturma/kopyalama/iptal var.
export function TopicExamShareRow({ examType, initialShares }: { examType: string; initialShares: ExamShare[] }) {
  const [shares, setShares] = useState(initialShares);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  async function createShare() {
    setBusy(true);
    const supabase = createClient();
    const token = generateToken();
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("exam_shares")
      .insert({ exam_type: examType, token, created_by: userData.user?.id ?? null })
      .select("id, exam_type, token")
      .single();
    setBusy(false);
    if (!error && data) {
      setShares((prev) => [data as ExamShare, ...prev]);
    }
  }

  async function revokeShare(shareId: string) {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("exam_shares").update({ revoked_at: new Date().toISOString() }).eq("id", shareId);
    setBusy(false);
    setShares((prev) => prev.filter((s) => s.id !== shareId));
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/paylasim/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((cur) => (cur === token ? null : cur)), 2000);
    });
  }

  async function handlePaylasClick() {
    if (shares.length === 0) {
      await createShare();
    }
    setOpen((v) => !v);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{examType}</span>
        <button
          type="button"
          disabled={busy}
          onClick={handlePaylasClick}
          className="touch-manipulation rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? "…" : "Paylaş"}
        </button>
      </div>
      {open && (
        <div className="mt-2 flex flex-col gap-1.5 border-t border-slate-100 pt-2">
          {shares.length === 0 ? (
            <p className="text-xs text-slate-400">Henüz link yok.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {shares.map((s) => (
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
          <button
            type="button"
            disabled={busy}
            onClick={createShare}
            className="touch-manipulation self-start text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
          >
            + Yeni link
          </button>
        </div>
      )}
    </div>
  );
}
