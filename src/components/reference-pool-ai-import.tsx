"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, Textarea } from "@/components/ui";

type Topic = { id: string; name: string; grade_level: number | null; subject_name: string; kazanim: string | null };

type Draft = {
  body: string;
  options: { A: string; B: string; C: string; D: string };
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
  topic_id: string | null;
  topic_guess_label: string;
  confidence: "high" | "medium" | "low";
  include: boolean;
};

const CONFIDENCE_LABEL: Record<Draft["confidence"], string> = {
  high: "Cevap anahtarından — yüksek güven",
  medium: "Orta güven",
  low: "AI tahmini — mutlaka kontrol et",
};
const CONFIDENCE_TONE: Record<Draft["confidence"], "green" | "amber" | "red"> = {
  high: "green",
  medium: "amber",
  low: "red",
};

// Gercek sinav PDF'lerinden kopyalanan HAM metin (bozuk bosluklu, "Soru:"/
// "A)" gibi sabit bir format TAKIP ETMEYEN) icin - asagidaki duz formatli
// BulkQuestionImport bu tur metinleri ayristiramiyor (kullanicinin AYT
// sinavi eklerken yasadigi sorun). Bu bilesen HAM metni oldugu gibi yapay
// zekaya gonderip soru/cevap/konu olarak yapilandirilmasini ister - "konu
// konu dagitmayi da sistem otomatik yapmali" talebi burada karsilaniyor.
// Sadece admin'in Soru Havuzu ekraninda kullanilir; kaydedilen her soru
// is_reference_only=true olur.
export function ReferencePoolAiImport() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [rawText, setRawText] = useState("");
  const [answerKeyText, setAnswerKeyText] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [classifying, setClassifying] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("topics")
      .select("id, name, grade_level, kazanim, subjects(name)")
      .then(({ data }) => {
        const rows = (data ?? []) as {
          id: string;
          name: string;
          grade_level: number | null;
          kazanim: string | null;
          subjects: { name: string } | { name: string }[] | null;
        }[];
        setTopics(
          rows.map((t) => ({
            id: t.id,
            name: t.name,
            grade_level: t.grade_level,
            kazanim: t.kazanim,
            subject_name: Array.isArray(t.subjects) ? t.subjects[0]?.name ?? "Diğer" : t.subjects?.name ?? "Diğer",
          }))
        );
      });
  }, []);

  const topicLabel = (t: Topic) => `${t.subject_name} — ${t.grade_level ? t.grade_level + ". sınıf" : "genel"} — ${t.name}`;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileLoading(true);
    setStatus(null);

    // Dosyanin kendisini de (metin cikarimindan bagimsiz olarak) ozel bir
    // storage bucket'ina yukleyip reference_pool_files'a kaydediyoruz - "PDF'ler"
    // sekmesinde gorulup silinebilsin diye. Bu adim basarisiz olsa bile metin
    // cikarimini engellemez (kullaniciyi bos elle birakmayalim).
    const supabase = createClient();
    const storagePath = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("reference-pool-files").upload(storagePath, file);
    if (!uploadError) {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("reference_pool_files").insert({
        file_name: file.name,
        storage_path: storagePath,
        mime_type: file.type || null,
        uploaded_by: userData.user?.id ?? null,
      });
      router.refresh();
    }

    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/questions/extract-text", { method: "POST", body: formData });
    const json = await res.json().catch(() => ({}));
    setFileLoading(false);
    if (!res.ok) {
      setStatus(`Hata: ${json?.error ?? "Dosya okunamadı"}`);
      return;
    }
    setRawText(json.text ?? "");
    setStatus('Dosyadan metin çıkarıldı, aşağıda kontrol edip "Yapay Zeka ile Ayrıştır ve Sınıflandır"a basabilirsin.');
    e.target.value = "";
  }

  async function handleParse() {
    if (!rawText.trim()) return;
    setLoading(true);
    setStatus(null);
    setDrafts([]);
    setSkipped([]);
    try {
      const res = await fetch("/api/ai/parse-exam-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          answerKeyText: answerKeyText.trim() || undefined,
          candidateTopics: topics.map((t) => ({ id: t.id, name: t.name, grade_level: t.grade_level, subject_name: t.subject_name })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus(`Hata: ${json?.error ?? "ayrıştırma başarısız"}`);
        return;
      }
      setDrafts(
        (json.questions ?? []).map((q: Omit<Draft, "include">) => ({ ...q, include: !!q.topic_id }))
      );
      setSkipped(json.skipped ?? []);
      if (!json.questions?.length) {
        setStatus("Hiç soru çıkarılamadı — metni kontrol edip tekrar dene.");
      }
    } catch (err) {
      setStatus(`Hata: ${err instanceof Error ? err.message : "beklenmeyen hata"}`);
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(index: number, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  // Yapay zekadan bagimsiz (yerel TF-IDF, API anahtari gerektirmeyen) konu
  // siniflandirma - "tasnifini sistem kendi içinde yapay zekadan bağımsız
  // yapabilmeli" talebinin karsiligi. Tek bir taslak icin kullanilir.
  async function classifyOne(index: number) {
    const draft = drafts[index];
    if (!draft) return;
    const res = await fetch("/api/questions/classify-topic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionBody: draft.body,
        candidateTopics: topics.map((t) => ({ id: t.id, name: t.name, kazanim: t.kazanim, grade_level: t.grade_level, subject_name: t.subject_name })),
      }),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.best) {
      updateDraft(index, { topic_id: json.best.topic_id, topic_guess_label: `${json.best.label} (AI'sız eşleşme)` });
    }
  }

  // Tum taslaklari tek seferde, tek bir istekle siniflandirir - buyuk bir
  // sinav yuklendiginde her soru icin ayri ayri "Ata" tuşuna basmak yerine
  // "Tümünü Sınıflandır (AI'sız)" ile hepsini bir kerede tasnif eder.
  async function classifyAll() {
    if (!drafts.length) return;
    setClassifying(true);
    try {
      const res = await fetch("/api/questions/classify-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: drafts.map((d, i) => ({ index: i, body: d.body })),
          candidateTopics: topics.map((t) => ({ id: t.id, name: t.name, kazanim: t.kazanim, grade_level: t.grade_level, subject_name: t.subject_name })),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.results) return;
      setDrafts((prev) =>
        prev.map((d, i) => {
          const match = json.results.find((r: { index: number; best: { topic_id: string; label: string } | null }) => r.index === i);
          if (!match?.best) return d;
          return { ...d, topic_id: match.best.topic_id, topic_guess_label: `${match.best.label} (AI'sız eşleşme)` };
        })
      );
    } finally {
      setClassifying(false);
    }
  }

  const includedCount = useMemo(() => drafts.filter((d) => d.include && d.topic_id).length, [drafts]);

  async function handleSaveAll() {
    const savable = drafts.filter((d) => d.include && d.topic_id);
    if (!savable.length) {
      setStatus("Kaydedilecek soru yok — her sorunun bir konusu seçili ve dahil edilmiş olmalı.");
      return;
    }
    setSaving(true);
    setStatus(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    const rows = savable.map((d) => ({
      topic_id: d.topic_id,
      created_by: userData.user?.id,
      body: d.body,
      options: d.options,
      correct_option: d.correct_option,
      explanation: d.explanation,
      source: "past_exam" as const,
      is_approved: true,
      is_reference_only: true,
    }));

    const { error } = await supabase.from("questions").insert(rows);
    setSaving(false);
    if (error) {
      setStatus(`Hata: ${error.message}`);
      return;
    }
    setStatus(`${rows.length} soru havuzuna eklendi.`);
    setDrafts([]);
    setSkipped([]);
    setRawText("");
    setAnswerKeyText("");
    // "Biriken Sorular" sekmesindeki liste, sayfa ilk yuklendiginde sunucudan
    // gelen bir prop - kaydettikten sonra router.refresh() cagirmazsak yeni
    // eklenen sorular orada gorunmez (kullanicinin bildirdigi "pdf ekledim
    // ama biriken sorularda gorunmedi" sorununun asil nedeni buydu).
    router.refresh();
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-900">Yapay Zeka ile Sınav Metninden İçe Aktar</h2>

      <div className="flex flex-col gap-3">
        <details className="group">
          <summary className="cursor-pointer touch-manipulation list-none text-xs font-medium text-slate-500 hover:text-slate-700">
            <span className="group-open:hidden">▸ Ham metni elle görmek/düzenlemek istersen aç</span>
            <span className="hidden group-open:inline">▾ Ham sınav metni</span>
          </summary>
          <div className="mt-1.5">
            <Textarea
              rows={5}
              className="text-xs leading-snug"
              placeholder="Sınav PDF'inden kopyaladığın metni buraya yapıştır..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">Dosya yükleyince otomatik dolar, elle de yapıştırabilirsin.</p>
          </div>
        </details>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Cevap anahtarı <span className="font-normal text-slate-400">(varsa ekle — doğruluğu artırır)</span>
          </label>
          <Textarea
            rows={3}
            placeholder="Örn: 1.B 2.D 3.A 4.C ..."
            value={answerKeyText}
            onChange={(e) => setAnswerKeyText(e.target.value)}
          />
        </div>
        <div>
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
        <div>
          <Button onClick={handleParse} disabled={loading || !rawText.trim()}>
            {loading ? "Yapay zeka ayrıştırıyor..." : "Yapay Zeka ile Ayrıştır ve Sınıflandır"}
          </Button>
        </div>
      </div>

      {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}

      {skipped.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
          <p className="mb-1 font-semibold">Atlanan sorular/parçalar:</p>
          {skipped.map((s, i) => (
            <p key={i}>• {s}</p>
          ))}
        </div>
      )}

      {drafts.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-700">{drafts.length} soru ayrıştırıldı</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={classifyAll} disabled={classifying}>
                {classifying ? "Sınıflandırılıyor..." : "Tümünü Sınıflandır (AI'sız)"}
              </Button>
              <Button onClick={handleSaveAll} disabled={saving || includedCount === 0}>
                {saving ? "Ekleniyor..." : `${includedCount} Soruyu Soru Havuzuna Ekle`}
              </Button>
            </div>
          </div>

          {drafts.map((d, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  <input type="checkbox" checked={d.include} onChange={(e) => updateDraft(i, { include: e.target.checked })} />
                  Dahil et
                </label>
                <Badge tone={CONFIDENCE_TONE[d.confidence]}>{CONFIDENCE_LABEL[d.confidence]}</Badge>
                <select
                  value={d.topic_id ?? ""}
                  onChange={(e) => updateDraft(i, { topic_id: e.target.value || null })}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="">— Konu seç ({d.topic_guess_label || "eşleşme yok"}) —</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {topicLabel(t)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => classifyOne(i)}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  title="Yapay zeka kullanmadan, sadece metin benzerliğine göre konu ata"
                >
                  Ata (AI&apos;sız)
                </button>
              </div>
              <p className="font-medium text-slate-900">{i + 1}. {d.body}</p>
              <ul className="mt-1.5 grid grid-cols-1 gap-1 text-slate-600 sm:grid-cols-2">
                {(["A", "B", "C", "D"] as const).map((key) => (
                  <li key={key}>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name={`correct-${i}`}
                        checked={d.correct_option === key}
                        onChange={() => updateDraft(i, { correct_option: key })}
                      />
                      <span className={d.correct_option === key ? "font-semibold text-emerald-700" : ""}>
                        {key}) {d.options[key]}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {d.explanation && (
                <div className="mt-2 rounded-lg bg-indigo-50 p-2.5 text-xs text-indigo-900">
                  <p className="mb-0.5 font-semibold uppercase tracking-wide text-indigo-500">Açıklama</p>
                  <p>{d.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
