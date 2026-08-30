"use client";

import { useEffect, useRef } from "react";
import { getAudioCtx, playHeartbeat } from "@/lib/sound/tension-audio";

// "Değerlendiriliyor..." bekleme sirasinda (bkz. question-answer-list.tsx'teki
// "finishing" durumu - ogrenci "Testi Bitir"/"Denemeyi Bitir" butonuna basip
// AI analizi beklerken) heyecan katmak icin kalp atisi benzeri, tekrar eden
// bir ses caliyoruz. `active` true oldugu surece (en fazla ~20 sn, AI analizi
// zaman asimina kadar) belirli araliklarla tekrarlanir; sonuc gelir gelmez
// (active false olur ya da bilesen kaldirilir) hemen durur. Gorsel bir seyi
// yok - sadece ses caliyor.
export function EvaluationHeartbeat({ active }: { active: boolean }) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) return;
    const ctx = getAudioCtx(audioCtxRef);
    if (!ctx) return;

    playHeartbeat(ctx);
    intervalRef.current = setInterval(() => playHeartbeat(ctx), 1100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [active]);

  // Bilesen tamamen kaldirildiginda (sayfadan ayrilma vb.) audio baglamini
  // da kapatiyoruz.
  useEffect(
    () => () => {
      audioCtxRef.current?.close().catch(() => {});
    },
    []
  );

  return null;
}
