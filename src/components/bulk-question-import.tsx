"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseQuestionsByTopic, type ParsedQuestion } from "@/lib/questions/bulk-parser";
import { Button, Card, Textarea } from "@/components/ui";

const FORMAT_EXAMPLE = `Konu: Üçgende Açılar
Soru: Bir üçgenin iç açıları toplamı kaç derecedir?
A) 90
B) 180
C) 270
D) 360
Cevap: B
Açıklama: Üçgende iç açılar toplamı her zaman 180 derecedir.

Konu: Eşkenar Üçgen
Soru: Eşkenar üçgende her açı kaç derecedir?
A) 45
B) 60
C) 90
D) 100
Cevap: B`;

type TopicOption = { id: string; name: string; subject_id: string };

type ResolvedQuestion = ParsedQuestion & {
  topicId: string | null;
  topicLabel: string;
};

export function BulkQuestionImport({
  topicId,
  rightsConfirmed,
  subjectIds,
}: {
  /** Ekranda o an secili konu - metinde "Konu:" basligi olmayan sorular icin varsayilan olarak kullanilir. */
  topicId: string;
  rightsConfirmed: boolean;
  /** Verilirse, "Konu:" baslıklarını eslestirirken sadece bu derslere ait konulara bakilir. */
  subjectIds?: string[];
}) {
  const [text, setText] = useState("");
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [resolved, setResolved] = useState<ResolvedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("topics")
      .select("id, name, subject_id")
      .then(({ data }) => setTopics((data as TopicOption[]) ?? []));
  }, []);

  const visibleTopics = subjectIds && subjectIds.length > 0 ? topics.filter((t) => subjectIds.includes(t.subject_id)) : topics;

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
    const sections = parseQuestionsByTopic(text);
    const errors: string[] = [];
    const questions: ResolvedQuestion[] = [];

    for (const section of sections) {
      let resolvedTopicId: string | null = null;
      let topicLabel: string;

      if (section.topicName) {
        const matches = visibleTopics.filter((t) => t.name.trim().toLowerCase() === section.topicName!.trim().toLowerCase());
        if (matches.length === 0) {
          errors.push(`"${section.topicName}" konusu bulunamadı — önce Müfredat sayfasından bu konuyu ekle, sonra tekrar dene.`);
          topicLabel = `${section.topicName} (bulunamadı)`;
        } else {
          resolvedTopicId = matches[0].id;
          topicLabel = section.topicName;
          if (matches.length > 1) {
            errors.push(`"${section.topicName}" adında birden fazla konu var, ilk bulunan kullanıldı. Karışıklığı önlemek için konu adlarını farklılaştırabilirsin.`);
          }
        }
      } else if (topicId) {
        const selected = visibleTopics.find((t) => t.id === topicId);
        resolvedTopicId = topicId;
        topicLabel = selected?.name ?? "Seçili konu";
      } else {
        errors.push('Metinde "Konu:" başlığı yok ve yukarıdan bir konu da seçilmedi — ya metne "Konu: ..." başlığı ekle ya da bir konu seç.');
        topicLabel = "Konu belirlenemedi";
      }

      section.result.errors.forEach((e) => errors.push(section.topicName ? `${section.topicName} — ${e}` : e));
      section.result.questions.forEach((q) => questions.push({ ...q, topicId: resolvedTopicId, topicLabel }));
    }

    if (!sections.length) {
      errors.push('Hiç soru bulunamadı. Her sorunun "Soru:" ile başladığından emin ol.');
    }

    setResolved(questions);
    setParseErrors(errors);
    setStatus(null);
  }

  async function handleSaveAll() {
    if (!rightsConfirmed) {
      setStatus("Devam etmeden önce yukarıdaki içerik kullanım hakkı onayını işaretle.");
      return;
    }
    const savable = resolved.filter((q) => q.topicId);
    if (!savable.length) {
      setStatus("Kaydedilecek soru yok — önce konuları doğru şekilde eşleştir.");
      return;
    }
    setSaving(true);
    setStatus(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    const rows = savable.map((q) => ({
      topic_id: q.topicId,
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
    const skipped = resolved.length - savable.length;
    setStatus(`${rows.length} soru eklendi.${skipped > 0 ? ` (${skipped} soru konu bulunamadığı için eklenmedi.)` : ""}`);
    setResolved([]);
    setText("");
  }

  const groupedByTopic = resolved.reduce<Record<string, ResolvedQuestion[]>>((acc, q) => {
    (acc[q.topicLabel] ??= []).push(q);
    return acc;
  }, {});

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-slate-900">Kopyala-Yapıştır / Dosyadan Toplu Soru Ekle</h2>
      <p className="mb-3 text-sm text-slate-500">
        Word (.docx), PDF (.pdf) veya .txt dosyası yükle, ya da sınavdan/Word&apos;den kopyaladığın soruları
        aşağıya yapıştır. Birden fazla konuyu tek seferde eklemek için her konudan önce ayrı bir satıra
        <strong> Konu: &lt;konu adı&gt;</strong> yaz — sistem soruları otomatik olarak doğru konuya dağıtır. Konu
        başlığı yazmazsan, yukarıdan seçtiğin konu kullanılır. Şimdilik yalnızca metin destekleniyor
        (taranmış/fotoğraflı sorular için görsel okuma henüz yok).
      </p>
      <p className="mb-3 text-xs text-amber-700">
        Not: Sadece kullanma hakkına sahip olduğun içerikleri yükle. ÖSYM gibi kurumların telif korumalı sınav
        sorularını (kağıt üzerinde &quot;yazılı izin alınmadan kullanılamaz&quot; ibaresi taşıyanlar dahil) izinsiz
        eklemek yasal risk taşır.
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
        <p className="mt-2">
          Tek bir konu ekliyorsan &quot;Konu:&quot; başlığını hiç yazmadan, sadece yukarıdan konuyu seçip
          doğrudan &quot;Soru:&quot; ile devam edebilirsin — eskisi gibi çalışmaya devam eder.
        </p>
      </details>

      <Textarea
        rows={12}
        placeholder="Soruları buraya yapıştır ya da yukarıdan dosya yükle..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={handleParse} disabled={!text.trim()}>
          Soruları Ayrıştır
        </Button>
        {resolved.length > 0 && (
          <Button onClick={handleSaveAll} disabled={saving || !rightsConfirmed}>
            {saving ? "Ekleniyor..." : `${resolved.filter((q) => q.topicId).length} Soruyu Ekle`}
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

      {resolved.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {Object.entries(groupedByTopic).map(([label, qs]) => (
            <div key={label}>
              <p className="mb-1 text-sm font-medium text-slate-700">{label} — {qs.length} soru</p>
              <ul className="flex flex-col gap-2">
                {qs.map((q, i) => (
                  <li key={i} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-900">{i + 1}. {q.body}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Doğru cevap: {q.correct_option} — {q.options[q.correct_option]}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
    </Card>
  );
}
