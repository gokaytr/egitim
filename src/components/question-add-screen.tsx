"use client";

import { useState } from "react";
import { TopicSelect } from "@/components/topic-select";
import { useMyAssignedSubjectIds } from "@/hooks/use-my-assigned-subject-ids";
import { ManualQuestionForm } from "@/components/manual-question-form";
import { AiQuestionGenerate } from "@/components/ai-question-generate";
import { BulkQuestionImport } from "@/components/bulk-question-import";
import { Card, Badge } from "@/components/ui";

export function QuestionAddScreen() {
  const subjectIds = useMyAssignedSubjectIds();
  const [topicId, setTopicId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [tab, setTab] = useState<"add" | "ai">("add");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Telif hakki onayi: elle ya da toplu eklenen sorularin veritabanina
          kaydedilebilmesi icin once burasi isaretlenmeli. ÖSYM gibi
          kurumlarin sinav sorulari yazili izin olmadan kullanilamaz -
          "sadece kendi veritabanimiza ekliyoruz" savunmasi yeterli degil,
          kopyalama ve turev uretme islemi zaten telif ihlali sayilabilir. */}
      <Card className="border-amber-200 bg-amber-50/60">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={rightsConfirmed}
            onChange={(e) => setRightsConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-slate-700">
            <strong>İçerik kullanım hakkı onayı:</strong> Eklediğim sorular kendi hazırladığım, açık lisanslı ya da
            kullanım hakkına sahip olduğum içeriklerdir. ÖSYM gibi kurumların telif korumalı sınav sorularını
            yazılı izin almadan eklemeyeceğimi kabul ediyorum. Bu kutuyu işaretlemeden soru kaydedilemez.
          </span>
        </label>
      </Card>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Konu</label>
        <div className="max-w-md">
          <TopicSelect value={topicId} onChange={setTopicId} subjectIds={subjectIds} />
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
          <ManualQuestionForm topicId={topicId} rightsConfirmed={rightsConfirmed} />
          <BulkQuestionImport topicId={topicId} rightsConfirmed={rightsConfirmed} subjectIds={subjectIds} />
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
