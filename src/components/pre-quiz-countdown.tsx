"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

// Ogrenci sorulari gormeden once heyecan yaratan, TAM EKRAN bir "hazir ol"
// ekrani: once konu/deneme adi ve sure bilgisiyle bir "Basla" butonu
// gosterilir, tiklaninca 3-2-1 geri sayimi oynar ve ardindan otomatik olarak
// asil soru ekranina geciliyor (onDone cagrilir). Hem konu testi
// (quiz-runner) hem deneme/seviye tespit (exam-runner) tarafindan ortak
// kullaniliyor. `fixed inset-0` ile sol menu/basliktan bagimsiz olarak tum
// ekrani kaplar.
//
// Ses: herhangi bir ses dosyasi kullanmiyoruz (lisans/dosya boyutu derdi
// olmasin diye) - Web Audio API ile aninda sentezlenen kisa bir "gerilim"
// drone'u (Basla'ya basinca) ve her sayi degisiminde kisa bir "tik" sesi
// caliyoruz. Tarayici otomatik ses politikasi geregi ses ancak bir
// kullanici etkilesiminden (Basla butonuna tiklama) sonra baslatilabiliyor.
export function PreQuizCountdown({
  topicLabel,
  durationLabel,
  onDone,
}: {
  topicLabel: string;
  durationLabel?: string;
  onDone: () => void;
}) {
  const [count, setCount] = useState<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function getAudioCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  }

  function playTick(freq: number, duration = 0.15) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  function playDrone() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(70, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 2.6);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 2.7);
  }

  useEffect(() => {
    if (count === null) return;
    if (count <= 0) {
      playTick(880, 0.3);
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
    playTick(440, 0.15);
    const t = setTimeout(() => setCount((c) => (c ?? 1) - 1), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  useEffect(
    () => () => {
      audioCtxRef.current?.close().catch(() => {});
    },
    []
  );

  function handleStart() {
    playDrone();
    setCount(3);
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 text-center text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">{topicLabel}</p>
      {count === null ? (
        <>
          <h2 className="text-3xl font-bold sm:text-4xl">Hazır mısın? 💪</h2>
          {durationLabel && <p className="text-sm text-indigo-200">{durationLabel}</p>}
          <Button onClick={handleStart} className="mt-4 px-8 py-3 text-base">
            🚀 Başla
          </Button>
        </>
      ) : (
        <>
          <p key={count} className="animate-bounce text-8xl font-black sm:text-9xl">
            {count > 0 ? count : "Başla! 🎯"}
          </p>
          {durationLabel && <p className="text-sm text-indigo-200">{durationLabel}</p>}
        </>
      )}
    </div>
  );
}
