"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui";
import { GradeBackground } from "@/components/grade-background";
import { gradeBackgroundVariant } from "@/lib/grade-level";
import { getAudioCtx, playHeartbeat, playTick } from "@/lib/sound/tension-audio";

// Ogrenci sorulari gormeden once heyecan yaratan, TAM EKRAN bir "hazir ol"
// ekrani: once konu/deneme adi ve sure bilgisiyle bir "Basla" butonu
// gosterilir, tiklaninca 3-2-1 geri sayimi oynar ve ardindan otomatik olarak
// asil soru ekranina geciliyor (onDone cagrilir). Hem konu testi
// (quiz-runner) hem deneme/seviye tespit (exam-runner) tarafindan ortak
// kullaniliyor.
//
// Gercekten TAM EKRAN olmasi (sol menu dahil hicbir sey gorunmemesi) icin
// `document.body`'ye React Portal ile tasiniyor. Sadece `fixed inset-0
// z-[60]` vermek yetmiyordu: RoleShell'in `<main>` icindeki icerik sarmalayici
// `relative z-10` oldugu icin kendi stacking context'ini olusturuyor, bu da
// icindeki her seyi (bu bileseni de) o baglam icine hapsediyor - dolayisiyla
// z-index ne kadar yuksek verilirse verilsin sol menu (z-20) hala ustte
// kalabiliyordu. Portal, DOM'da body'nin dogrudan altina tasiyarak bu
// hapsi tamamen asiyor. SSR sirasinda `document` olmadigindan, ilk render'da
// (mounted=false) portal kullanmiyoruz - React hydration uyusmazligi
// olusmasin diye; client'ta mount olur olmaz portal'a geciliyor.
//
// Arka plan: ogrencinin sinif duzeyine gore degisen ayni seffaf/soluk gorsel
// (GradeBackground) burada da gosteriliyor - paneldeki diger ekranlarla
// tutarli olsun diye. Uzerine, beyaz metnin okunabilir kalmasi icin hafif bir
// gradyan bindiriliyor (gorsel net gorunsun diye asiri koyu tutulmuyor).
//
// Ses: herhangi bir ses dosyasi kullanmiyoruz (lisans/dosya boyutu derdi
// olmasin diye) - Web Audio API ile aninda sentezlenen, kalp atisi benzeri
// bir "gerilim" sesi (Basla'ya basinca, 3-2-1'e paralel hizlanarak) ve her
// sayi degisiminde kisa bir "tik" sesi caliyoruz. Tarayici otomatik ses
// politikasi geregi ses ancak bir kullanici etkilesiminden (Basla butonuna
// tiklama) sonra baslatilabiliyor.
export function PreQuizCountdown({
  topicLabel,
  durationLabel,
  gradeLevel,
  onDone,
}: {
  topicLabel: string;
  durationLabel?: string;
  gradeLevel?: number | null;
  onDone: () => void;
}) {
  const [count, setCount] = useState<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const variant = gradeBackgroundVariant(gradeLevel ?? null);

  // Portal'a gecmeden once bir tur normal render yapmamiz gerekiyor - aksi
  // halde sunucu (document yok) ile istemcinin ilk render'i (document var)
  // arasinda fark olusur ve React hydration uyusmazligi verir.
  // `useSyncExternalStore`, sunucuda hep `false`, istemcide (hydration
  // sonrasi) `true` dondurerek bunu bir setState/useEffect kullanmadan,
  // React'in kendi onerdigi yontemle cozuyor.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (count === null) return;
    const ctx = getAudioCtx(audioCtxRef);
    if (count <= 0) {
      if (ctx) playTick(ctx, 880, 0.3);
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
    if (ctx) playTick(ctx, 440, 0.15);
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
    const ctx = getAudioCtx(audioCtxRef);
    if (ctx) {
      // 3-2-1 ile ayni ritimde (700ms araliklarla), gitgide hafifce
      // kuvvetlenen 3 kalp atisi - "geri sayim muzigi" gibi duzgun bir
      // gerilim hissi veriyor, sonunda hicbir "zirlama/kesilme" sesi kalmiyor.
      playHeartbeat(ctx, 0, 1);
      playHeartbeat(ctx, 0.7, 1.15);
      playHeartbeat(ctx, 1.4, 1.3);
    }
    setCount(3);
  }

  const overlay = (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
      <GradeBackground variant={variant} />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/45 via-indigo-950/35 to-slate-950/45" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300 drop-shadow">{topicLabel}</p>
        {count === null ? (
          <>
            <h2 className="text-3xl font-bold drop-shadow sm:text-4xl">Hazır mısın? 💪</h2>
            {durationLabel && <p className="text-sm text-indigo-200 drop-shadow">{durationLabel}</p>}
            <Button onClick={handleStart} className="mt-4 px-8 py-3 text-base">
              🚀 Başla
            </Button>
          </>
        ) : (
          <>
            <p key={count} className="animate-bounce text-8xl font-black drop-shadow sm:text-9xl">
              {count > 0 ? count : "Başla! 🎯"}
            </p>
            {durationLabel && <p className="text-sm text-indigo-200 drop-shadow">{durationLabel}</p>}
          </>
        )}
      </div>
    </div>
  );

  // Sunucu tarafinda (SSR) ve ilk client render'inda `document` guvenilir
  // olmadigi/hydration uyusmazligi yaratmamasi icin portal'i sadece
  // mount olduktan sonra kullaniyoruz.
  if (!mounted) return null;
  return createPortal(overlay, document.body);
}
