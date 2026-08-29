"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";

type QualityResult = {
  verdict: "sorun_yok" | "sorunlu" | "bilinmiyor";
  summary: string;
  issues: string[];
};

export function AiCheckButton({ questionId }: { questionId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QualityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/questions/ai-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? "Kontrol edilemedi, tekrar dener misin?");
        return;
      }
      setResult(json.result);
    } catch {
      setError("Bağlantı sorunu oldu, tekrar dener misin?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <Button variant="secondary" onClick={handleCheck} disabled={loading}>
        {loading ? "Yapay zeka kontrol ediyor..." : "🔎 Yapay Zekayla Kontrol Et"}
      </Button>

      {error && <p className="mt-1.5 text-xs text-amber-600">{error}</p>}

      {result && (
        <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
          <div className="mb-1 flex items-center gap-2">
            {result.verdict === "sorun_yok" && <Badge tone="green">Sorun görünmüyor</Badge>}
            {result.verdict === "sorunlu" && <Badge tone="red">Dikkat - sorun olabilir</Badge>}
            {result.verdict === "bilinmiyor" && <Badge tone="amber">Kontrol edilemedi</Badge>}
          </div>
          <p className="text-slate-700">{result.summary}</p>
          {result.issues?.length > 0 && (
            <ul className="mt-1.5 list-inside list-disc text-slate-600">
              {result.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Bu bir yapay zeka önerisidir, onay/red kararını sen veriyorsun.
          </p>
        </div>
      )}
    </div>
  );
}
