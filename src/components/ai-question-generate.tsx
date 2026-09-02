"use client";

import { useState } from "react";
import { Card, Button, Input, Select, Badge } from "@/components/ui";
import { DIFFICULTY_ORDER, DIFFICULTY_LABELS, type QuestionDifficulty } from "@/lib/questions/difficulty";

type Draft = {
  body: string;
  options: Record<string, string>;
  correct_option: string;
  explanation?: string;
  option_error_tags?: Record<string, string>;
};

export function AiQuestionGenerate({ topicId, onStatus }: { topicId: string; onStatus?: (msg: string) => void }) {
  const [aiDifficulty, setAiDifficulty] = useState<QuestionDifficulty>("orta");
  const [aiCount, setAiCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDrafts, setAiDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleAiGenerate() {
    if (!topicId) {
      setError("Önce bir konu seçin.");
      return;
    }
    setAiLoading(true);
    setError(null);
    const res = await fetch("/api/ai/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId, difficulty: aiDifficulty, count: aiCount }),
    });
    const json = await res.json();
    setAiLoading(false);
    if (!res.ok) {
      setError(`Hata: ${json.error}`);
      return;
    }
    setAiDrafts(json.questions.map((q: Draft) => q));
    const qualityNote =
      json.rejected_for_quality > 0
        ? ` (${json.rejected_for_quality} taslak kalite kontrolünden geçemediği için otomatik elendi.)`
        : "";
    onStatus?.(
      `${json.questions.length} soru üretildi ve öğrencilere yayınlandı. Kalite kontrolü için "Soru Onayı" ekranından öğretmen/admin incelemesi bekleniyor.${qualityNote}`
    );
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-900">Yapay Zeka ile Soru Üret</h2>
      <p className="mb-3 text-sm text-slate-500">
        Üretilen sorular hemen öğrencilere yayınlanır; öğretmen/admin onayı ayrı bir kalite kontrolüdür, sorunun
        görünürlüğünü etkilemez.
      </p>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Zorluk kademesi</label>
          <Select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value as QuestionDifficulty)}>
            {DIFFICULTY_ORDER.map((d) => <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>)}
          </Select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Adet</label>
          <Input type="number" min={1} max={15} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} />
        </div>
      </div>
      <Button className="mt-4" onClick={handleAiGenerate} disabled={aiLoading}>
        {aiLoading ? "Üretiliyor..." : "Soru Üret"}
      </Button>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {aiDrafts.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {aiDrafts.map((d, i) => (
            <li key={i} className="rounded-lg bg-slate-50 p-3 text-sm">
              <Badge tone="amber">Onay bekliyor</Badge>
              <p className="mt-1 font-medium">{d.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
