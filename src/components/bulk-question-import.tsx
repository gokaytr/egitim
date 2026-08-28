"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseQuestionsText, type ParsedQuestion } from "@/lib/questions/bulk-parser";
import { Button, Card, Textarea } from "@/components/ui";

const FORMAT_EXAMPLE = `Soru: Bir üçgenin iç açıları toplamı kaç derecedir?
A) 90
B) 180
C) 270
D) 360
Cevap: B
Açıklama: Üçgende iç açılar toplamı her zaman 180 derecedir.

Soru: Eşkenar üçgende her açı kaç derecedir?
A) 45
B) 60
C) 90
D) 100
Cevap: B`;

export function BulkQuestionImport({ topicId }: { topicId: string }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileLoading(true);
    setStatus(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/questions/extract-text", { method: "POST", body: formData });
    const json = await res.json().catch(() => ({}));
    setFileLoading(false);
    if (!res.ok) {
      setStatus(`Hata: ${json?.error ?? "Dosya okunamadı"}`);
      return;
    }
    setText(json.text ?? "");
    setStatus("Dosyadan metin çıkarıldı, aşağıda kontrol edip \"Soruları Ayrıştır\"a basabilirsin.");
    e.target.value = "";
  }

  function handleParse() {
    const result = parseQuestionsText(text);
    setParsed(result.questions);
    setParseErrors(result.errors);
    setStatus(null);
  }

  async function handleSaveAll() {
    if (!topicId) {
      setStatus("Önce bir konu seç.");
      return;
    }
    if (!parsed.length) return;
    setSaving(true);
    setStatus(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    const rows = parsed.map((q) => ({
      topic_id: topicId,
      created_by: userData.user?.id,
      body: q.body,
      options: q.options,
      correct_option: q.correct_option,
      explanation: q.explanation,
      source: "teacher" as const,
      is_approved: true,
    }));

    const { error } = await supabase.from("questions").insert(rows);
    setSaving(false);
    if (error) {
      setStatus(`Hata: ${error.message}`);
      return;
    }
    setStatus(`${rows.length} soru eklendi.`);
    setParsed([]);
    setText("");
  }

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-slate-900">Kopyala-Yapıştır / Dosyadan Toplu Soru Ekle</h2>
      <p className="mb-3 text-sm text-slate-500">
        Word (.docx), PDF (.pdf) veya .txt dosyası yükle, ya da sınavdan/Word&apos;den kopyaladığın soruları
        aşağıya yapıştır. Şimdilik yalnızca metin destekleniyor (taranmış/fotoğraflı sorular için görsel okuma henüz yok).
      </p>

      <div className="mb-3">
        <label className="mb-1 block text-sm font-medium text-slate-700">Dosya Yükle (.docx, .pdf, .txt)</label>
        <input
          type="file"
          accept=".docx,.pdf,.txt"
          onChange={handleFileChange}
          disabled={fileLoading}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        {fileLoading && <p className="mt-1 text-xs text-slate-500">Dosyadan metin çıkarılıyor...</p>}
      </div>

      <details className="mb-3 text-xs text-slate-500">
        <summary className="cursor-pointer font-medium text-indigo-600">Yapıştırma formatı nasıl olmalı?</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-600">{FORMAT_EXAMPLE}</pre>
      </details>

      <Textarea
        rows={10}
        placeholder="Soruları buraya yapıştır ya da yukarıdan dosya yükle..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={handleParse} disabled={!text.trim()}>
          Soruları Ayrıştır
        </Button>
        {parsed.length > 0 && (
          <Button onClick={handleSaveAll} disabled={saving}>
            {saving ? "Ekleniyor..." : `${parsed.length} Soruyu Ekle`}
          </Button>
        )}
      </div>

      {parseErrors.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
          {parseErrors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      {parsed.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {parsed.map((q, i) => (
            <li key={i} className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">{i + 1}. {q.body}</p>
              <p className="mt-1 text-xs text-slate-500">
                Doğru cevap: {q.correct_option} — {q.options[q.correct_option]}
              </p>
            </li>
          ))}
        </ul>
      )}

      {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
    </Card>
  );
}
