"use client";

import { useState } from "react";
import { TopicSelect } from "@/components/topic-select";
import { ManualQuestionForm } from "@/components/manual-question-form";
import { AiQuestionGenerate } from "@/components/ai-question-generate";
import { BulkQuestionImport } from "@/components/bulk-question-import";
import { Card, Badge } from "@/components/ui";

export function QuestionAddScreen() {
  const [topicId, setTopicId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [tab, setTab] = useState<"add" | "ai">("add");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Konu</label>
        <div className="max-w-md">
          <TopicSelect value={topicId} onChange={setTopicId} />
        </div>
      </div>

      <div className="flex max-w-md gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab("add")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "add" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Soru Ekle
        </button>
        <button
          type="button"
          onClick={() => setTab("ai")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "ai" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Yapay Zeka ile Soru Üret
          <Badge tone="amber">Test</Badge>
        </button>
      </div>

      {tab === "add" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ManualQuestionForm topicId={topicId} />
          {topicId ? (
            <BulkQuestionImport topicId={topicId} />
          ) : (
            <Card>
              <h2 className="mb-1 font-semibold text-slate-900">Kopyala-Yapıştır / Dosyadan Toplu Soru Ekle</h2>
              <p className="text-sm text-slate-500">Toplu soru içe aktarmak için önce yukarıdan bir konu seç.</p>
            </Card>
          )}
        </div>
      )}

      {tab === "ai" && (
        <div className="max-w-xl">
          <div className="mb-3 flex items-center gap-2">
            <Badge tone="amber">Test aşamasında</Badge>
            <p className="text-sm text-slate-500">
              Bu özellik henüz test aşamasında, ara sıra hata verebilir.
            </p>
          </div>
          <AiQuestionGenerate topicId={topicId} onStatus={setStatus} />
        </div>
      )}

      {status && <p className="text-sm text-slate-600">{status}</p>}
    </div>
  );
}
