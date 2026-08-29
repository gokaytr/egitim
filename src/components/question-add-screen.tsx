"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TopicPickerTabs } from "@/components/topic-picker-tabs";
import { useMyAssignedSubjectIds } from "@/hooks/use-my-assigned-subject-ids";
import { ManualQuestionForm } from "@/components/manual-question-form";
import { AiQuestionGenerate } from "@/components/ai-question-generate";
import { BulkQuestionImport } from "@/components/bulk-question-import";
import { Card, Badge, Button } from "@/components/ui";

const RIGHTS_TEXT =
  "İçerik kullanım hakkı onayı: Eklediğim sorular kendi hazırladığım, açık lisanslı ya da kullanım hakkına sahip olduğum içeriklerdir. ÖSYM gibi kurumların telif korumalı sınav sorularını yazılı izin almadan eklemeyeceğimi kabul ediyorum. Bu kutuyu işaretlemeden soru kaydedilemez.";

// Icerik kullanim hakki onayi artik her seferinde isaretlenen bir kutu
// degil, kullanicinin (ogretmen/admin) Soru Ekle ekranina ILK girdiginde
// gordugu tek seferlik bir onay ekrani - kabul edince profiles tablosuna
// zaman damgasi yazilir ve bir daha hic gosterilmez.
function useContentRightsAck() {
  const [ackAt, setAckAt] = useState<string | null | undefined>(undefined); // undefined = henuz yuklenmedi
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: userData }) => {
      if (!userData.user) {
        setAckAt(null);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("content_rights_ack_at")
        .eq("id", userData.user.id)
        .single();
      setAckAt(profile?.content_rights_ack_at ?? null);
    });
  }, []);

  async function acknowledge() {
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    await supabase.from("profiles").update({ content_rights_ack_at: now }).eq("id", userData.user?.id ?? "");
    setSaving(false);
    setAckAt(now);
  }

  return { ackAt, saving, acknowledge };
}

export function QuestionAddScreen() {
  const subjectIds = useMyAssignedSubjectIds();
  const [topicId, setTopicId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [tab, setTab] = useState<"add" | "ai">("add");
  const { ackAt, saving, acknowledge } = useContentRightsAck();

  if (ackAt === undefined) {
    return null;
  }

  if (!ackAt) {
    return (
      <Card className="max-w-2xl border-amber-200 bg-amber-50/60">
        <h2 className="mb-2 font-semibold text-slate-900">Devam etmeden önce</h2>
        <p className="text-sm text-slate-700">{RIGHTS_TEXT}</p>
        <Button className="mt-4" disabled={saving} onClick={acknowledge}>
          {saving ? "Kaydediliyor..." : "Onaylıyorum, devam et"}
        </Button>
        <p className="mt-2 text-xs text-slate-500">Bu onay bir kereliğine isteniyor, bir daha karşına çıkmayacak.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Konu</label>
        <TopicPickerTabs value={topicId} onChange={setTopicId} subjectIds={subjectIds} />
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
          <BulkQuestionImport topicId={topicId} subjectIds={subjectIds} />
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
