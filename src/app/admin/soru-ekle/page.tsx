"use client";

import { useState } from "react";
import { TopicSelect } from "@/components/topic-select";
import { ManualQuestionForm } from "@/components/manual-question-form";
import { AiQuestionGenerate } from "@/components/ai-question-generate";
import { BulkQuestionImport } from "@/components/bulk-question-import";

export default function AdminSoruEklePage() {
  const [topicId, setTopicId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Soru Ekle</h1>
        <p className="text-sm text-slate-500">
          Elle soru ekleyin, yapay zekaya taslak sorular ürettirin veya kopyala-yapıştır ile ya da PDF/Word
          dosyası yükleyerek toplu soru içe aktarın. Bu ekran öğretmen panelindeki soru ekleme ekranıyla
          aynı işlevi görür.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Konu</label>
        <div className="max-w-md">
          <TopicSelect value={topicId} onChange={setTopicId} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ManualQuestionForm topicId={topicId} />
        <AiQuestionGenerate topicId={topicId} onStatus={setStatus} />
      </div>

      {topicId ? (
        <BulkQuestionImport topicId={topicId} />
      ) : (
        <p className="text-sm text-slate-500">Toplu soru içe aktarmak için önce bir konu seçin.</p>
      )}

      {status && <p className="text-sm text-slate-600">{status}</p>}
    </div>
  );
}
