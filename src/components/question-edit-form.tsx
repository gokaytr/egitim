"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { DIFFICULTY_ORDER, DIFFICULTY_LABELS, type QuestionDifficulty } from "@/lib/questions/difficulty";

export type EditableQuestion = {
  id: string;
  body: string;
  options: Record<string, string>;
  correct_option: string;
  explanation: string | null;
  difficulty: QuestionDifficulty | null;
  image_url?: string | null;
};

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

// Admin her soruyu, sorunun onaylayicisi ise sadece kendi onayladigi soruyu
// duzeltebilmeli (bkz. CLAUDE.md "Soru cevap aciklamasi kurali" - aciklama
// bos birakilamaz). Bu form hem "Soru Onayla" hem "Son Eklenen/Onaylanan
// Sorular" gibi birden fazla yerde ayni sekilde kullanilabilsin diye
// bagimsiz/tekrar kullanilabilir bir bilesen olarak yazildi.
export function QuestionEditForm({ question, onDone }: { question: EditableQuestion; onDone?: () => void }) {
  const router = useRouter();
  const [body, setBody] = useState(question.body);
  const [options, setOptions] = useState<Record<string, string>>(() => ({
    A: question.options.A ?? "",
    B: question.options.B ?? "",
    C: question.options.C ?? "",
    D: question.options.D ?? "",
  }));
  const [correctOption, setCorrectOption] = useState(question.correct_option);
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(question.difficulty ?? "orta");
  const [imageUrl, setImageUrl] = useState(question.image_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!body.trim() || !explanation.trim()) {
      setError("Soru metni ve açıklama boş bırakılamaz.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("questions")
      .update({
        body: body.trim(),
        options,
        correct_option: correctOption,
        explanation: explanation.trim(),
        difficulty,
        image_url: imageUrl.trim() || null,
      })
      .eq("id", question.id);
    setSaving(false);
    if (updateError) {
      setError("Kaydedilemedi: " + updateError.message);
      return;
    }
    router.refresh();
    onDone?.();
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Soru metni</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {OPTION_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <input
                type="radio"
                name={`correct-${question.id}`}
                checked={correctOption === key}
                onChange={() => setCorrectOption(key)}
              />
              {key}
            </label>
            <input
              value={options[key] ?? ""}
              onChange={(e) => setOptions((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white p-1.5 text-sm"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Açıklama (doğru cevap neden doğru)</label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Görsel URL&apos;i (opsiyonel — Gemini gibi bir yapay zekada üretip buraya yapıştır)
        </label>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Zorluk</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
          className="rounded-lg border border-slate-300 bg-white p-1.5 text-sm"
        >
          {DIFFICULTY_ORDER.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button disabled={saving} onClick={save}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
        <Button variant="secondary" disabled={saving} onClick={() => onDone?.()}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
