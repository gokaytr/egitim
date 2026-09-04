"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Input, Textarea, Select } from "@/components/ui";

// isReferenceOnly=true verilirse (sadece admin'in Soru Havuzu ekranindan
// kullanilir), eklenen soru dogrudan is_reference_only=true olarak
// kaydedilir - yani ogrenciye hicbir zaman gosterilmez, sadece yapay
// zekanin ornek alip egitilmesi icin saklanir (bkz. CLAUDE.md).
//
// autoApprove=false verilirse (ogretmen panelindeki "Soru Ekle / Onay"
// akisinda kullanilir) soru is_approved=false olarak kaydedilir - boylece
// ekleyen ogretmen, kullanicinin talebiyle, eklendikten hemen sonra ayni
// ekranda goruntulenen "Onayla" butonuyla kendi soruşunu bilinçli bir
// adimda onaylar (sessizce otomatik onaylanmaz).
export function ManualQuestionForm({
  topicId,
  isReferenceOnly = false,
  autoApprove = true,
  onAdded,
}: {
  topicId: string;
  isReferenceOnly?: boolean;
  autoApprove?: boolean;
  /** Soru basariyla eklendiginde cagrilir - ust bilesen (ör. konunun soru
   * listesi) tazelensin diye. */
  onAdded?: () => void;
}) {
  const [manual, setManual] = useState({ body: "", a: "", b: "", c: "", d: "", correct: "A", explanation: "", imageUrl: "" });
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topicId) return setStatus("Lütfen bir konu seçin.");
    if (!manual.explanation.trim()) {
      return setStatus("Çözüm açıklaması zorunludur — öğrenci yanlış yaptığında doğru cevabın nedenini görebilmeli.");
    }
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
      is_approved: isReferenceOnly ? true : autoApprove,
      is_reference_only: isReferenceOnly,
    });

    setLoading(false);
    if (error) setStatus(`Hata: ${error.message}`);
    else {
      setStatus(
        isReferenceOnly
          ? "Soru havuzuna eklendi."
          : autoApprove
            ? "Soru eklendi."
            : "Soru eklendi — aşağıdaki listede \"Onayla\" butonuna basarak yayına alabilirsin."
      );
      setManual({ body: "", a: "", b: "", c: "", d: "", correct: "A", explanation: "", imageUrl: "" });
      onAdded?.();
    }
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-900">{isReferenceOnly ? "Elle Soru Havuzuna Ekle" : "Elle Soru Ekle"}</h2>
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
        <Textarea
          required
          rows={2}
          placeholder="Çözüm açıklaması — doğru cevap neden doğru? (zorunlu)"
          value={manual.explanation}
          onChange={(e) => setManual({ ...manual, explanation: e.target.value })}
        />
        <Button type="submit" disabled={loading}>{loading ? "Ekleniyor..." : "Soruyu Ekle"}</Button>
      </form>
      {status && <p className="mt-2 text-sm text-slate-600">{status}</p>}
    </Card>
  );
}
