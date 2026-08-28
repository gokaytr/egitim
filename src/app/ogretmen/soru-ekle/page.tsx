"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Input, Textarea, Select, Badge } from "@/components/ui";
import { TopicSelect } from "@/components/topic-select";

type Draft = {
  body: string;
  options: Record<string, string>;
  correct_option: string;
  explanation?: string;
  option_error_tags?: Record<string, string>;
};

export default function SoruEklePage() {
  const [topicId, setTopicId] = useState("");
  const [manual, setManual] = useState({ body: "", a: "", b: "", c: "", d: "", correct: "A", explanation: "", imageUrl: "" });
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [aiDifficulty, setAiDifficulty] = useState(3);
  const [aiCount, setAiCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDrafts, setAiDrafts] = useState<Draft[]>([]);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topicId) return setStatus("Lütfen bir konu seçin.");
    setLoading(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("questions").insert({
      topic_id: topicId,
      created_by: userData.user?.id,
      body: manual.body,
      image_url: manual.imageUrl || null,
      options: { A: manual.a, B: manual.b, C: manual.c, D: manual.d },
      correct_option: manual.correct,
      explanation: manual.explanation,
      source: "teacher",
      is_approved: true,
    });

    setLoading(false);
    if (error) setStatus(`Hata: ${error.message}`);
    else {
      setStatus("Soru eklendi.");
      setManual({ body: "", a: "", b: "", c: "", d: "", correct: "A", explanation: "", imageUrl: "" });
    }
  }

  async function handleAiGenerate() {
    if (!topicId) return setStatus("Önce bir konu seçin.");
    setAiLoading(true);
    setStatus(null);
    const res = await fetch("/api/ai/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId, difficulty: aiDifficulty, count: aiCount }),
    });
    const json = await res.json();
    setAiLoading(false);
    if (!res.ok) {
      setStatus(`Hata: ${json.error}`);
      return;
    }
    setAiDrafts(json.questions.map((q: { body: string; options: Record<string, string>; correct_option: string; explanation: string }) => q));
    setStatus(`${json.questions.length} soru üretildi. Onay için "Soru Onayı" ekranından yönetici veya öğretmen onayı bekleniyor.`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Soru Ekle</h1>
        <p className="text-sm text-slate-500">Elle soru ekleyin veya yapay zekaya konuya uygun taslak sorular ürettirin.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Konu</label>
        <div className="max-w-md">
          <TopicSelect value={topicId} onChange={setTopicId} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold text-slate-900">Elle Soru Ekle</h2>
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
            <Textarea required rows={3} placeholder="Soru metni" value={manual.body} onChange={(e) => setManual({ ...manual, body: e.target.value })} />
            <Input placeholder="Görsel URL (opsiyonel - şekil, grafik vb.)" value={manual.imageUrl} onChange={(e) => setManual({ ...manual, imageUrl: e.target.value })} />
            <Input required placeholder="A şıkkı" value={manual.a} onChange={(e) => setManual({ ...manual, a: e.target.value })} />
            <Input required placeholder="B şıkkı" value={manual.b} onChange={(e) => setManual({ ...manual, b: e.target.value })} />
            <Input required placeholder="C şıkkı" value={manual.c} onChange={(e) => setManual({ ...manual, c: e.target.value })} />
            <Input required placeholder="D şıkkı" value={manual.d} onChange={(e) => setManual({ ...manual, d: e.target.value })} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Doğru Şık</label>
              <Select value={manual.correct} onChange={(e) => setManual({ ...manual, correct: e.target.value })}>
                {["A", "B", "C", "D"].map((k) => <option key={k} value={k}>{k}</option>)}
              </Select>
            </div>
            <Textarea rows={2} placeholder="Çözüm açıklaması (opsiyonel)" value={manual.explanation} onChange={(e) => setManual({ ...manual, explanation: e.target.value })} />
            <Button type="submit" disabled={loading}>{loading ? "Ekleniyor..." : "Soruyu Ekle"}</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-slate-900">Yapay Zeka ile Soru Üret</h2>
          <p className="mb-3 text-sm text-slate-500">
            Üretilen sorular doğrudan öğrenciye gösterilmez, önce &quot;Soru Onayı&quot; ekranından onaylanır.
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Zorluk (1-5)</label>
              <Select value={aiDifficulty} onChange={(e) => setAiDifficulty(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d}</option>)}
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
      </div>

      {status && <p className="text-sm text-slate-600">{status}</p>}
    </div>
  );
}
