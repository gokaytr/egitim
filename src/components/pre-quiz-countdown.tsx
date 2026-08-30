"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";

// Ogrenci sorulari gormeden once heyecan yaratan kisa bir "hazir ol" ekrani:
// once konu/deneme adi ve sure bilgisiyle bir "Basla" butonu gosterilir,
// tiklaninca 3-2-1 geri sayimi oynar ve ardindan otomatik olarak asil
// soru ekranina geciliyor (onDone cagrilir). Hem konu testi (quiz-runner)
// hem deneme/seviye tespit (exam-runner) tarafindan ortak kullaniliyor.
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

  useEffect(() => {
    if (count === null) return;
    if (count <= 0) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => (c ?? 1) - 1), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  if (count === null) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{topicLabel}</p>
        <h2 className="text-2xl font-semibold text-slate-900">Hazır mısın? 💪</h2>
        {durationLabel && <p className="text-sm text-slate-500">{durationLabel}</p>}
        <Button onClick={() => setCount(3)} className="mt-2">
          🚀 Başla
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-3 py-14 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{topicLabel}</p>
      <p key={count} className="animate-bounce text-7xl font-bold text-indigo-600">
        {count > 0 ? count : "Başla! 🎯"}
      </p>
      {durationLabel && <p className="text-sm text-slate-500">{durationLabel}</p>}
    </Card>
  );
}
