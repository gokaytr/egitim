"use client";

import { useEffect, useRef } from "react";
import { getAudioCtx, playResultChime } from "@/lib/sound/tension-audio";

// Sonuc ekrani ("Sonuç" karti) ilk gorundugunde bir kere calan, kisa ve
// aninda biten bir "sonuc verildi" cinlemesi. Bu bilesen yalnizca sonuc
// ekrani mount oldugunda (quiz-runner/exam-runner'da `result` state'i dolunca
// ilk kez render edilir) calisir - bekleme sirasinda (eski "kalp atisi"
// davranisi) tekrarlamiyor, cunku istenen aninda/tek seferlik bir sesti.
export function ResultRevealSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const ctx = getAudioCtx(audioCtxRef);
    if (ctx) playResultChime(ctx);
    return () => {
      ctx?.close().catch(() => {});
    };
  }, []);

  return null;
}
