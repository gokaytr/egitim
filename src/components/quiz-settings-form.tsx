"use client";

import { useState } from "react";
import { Card, Button, Select } from "@/components/ui";
import type { QuizDisplaySettings } from "@/components/question-answer-list";

// Ogrencinin deneme/konu testi ekranlarindaki soru basi sure siniri ve
// gosterim bicimi tercihlerini duzenledigi form. Kaydet'e basinca
// /api/student/quiz-settings'e yazilir; sayfa yenilenince yeni deger
// deneme/konu testi ekranlarina yansir. Admin bir test ogrenciyi
// onizlerken `studentId` gecilir - o zaman kaydedilen ayar admin'in kendi
// hesabina degil, onizlenen ogrenciye yazilir.
export function QuizSettingsForm({ initial, studentId }: { initial: QuizDisplaySettings; studentId?: string }) {
  const [timerEnabled, setTimerEnabled] = useState(initial.timerEnabled);
  const [minutesPerQuestion, setMinutesPerQuestion] = useState(Math.max(1, Math.round(initial.secondsPerQuestion / 60)));
  const [oneQuestionPerPage, setOneQuestionPerPage] = useState(initial.oneQuestionPerPage);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/student/quiz-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timerEnabled,
          secondsPerQuestion: minutesPerQuestion * 60,
          oneQuestionPerPage,
          ...(studentId ? { studentId } : {}),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Ayarlar kaydedilemedi.");
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ayarlar kaydedilirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex max-w-xl flex-col gap-5">
      <div>
        <h2 className="font-semibold text-slate-900">Soru Başı Süre Sınırı</h2>
        <p className="mt-1 text-sm text-slate-500">
          Açarsan deneme ve konu testi ekranlarında yukarıda kalan süre gösterilir; süreye tıklayarak da her zaman
          buraya dönebilirsin.
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-indigo-600"
            checked={timerEnabled}
            onChange={(e) => setTimerEnabled(e.target.checked)}
          />
          Süre sınırını etkinleştir
        </label>
        {timerEnabled && (
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            Soru başına
            <input
              type="number"
              min={1}
              max={60}
              value={minutesPerQuestion}
              onChange={(e) => setMinutesPerQuestion(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
              className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center"
            />
            dakika
          </label>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-slate-900">Soru Gösterim Biçimi</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sorular tek sayfada aşağı kaydırarak mı, yoksa sayfa başı bir soru şeklinde mi gösterilsin?
        </p>
        <div className="mt-3 max-w-xs">
          <Select
            value={oneQuestionPerPage ? "sayfa-basi-bir-soru" : "kaydirmali-liste"}
            onChange={(e) => setOneQuestionPerPage(e.target.value === "sayfa-basi-bir-soru")}
          >
            <option value="kaydirmali-liste">Kaydırmalı liste (varsayılan)</option>
            <option value="sayfa-basi-bir-soru">Sayfa başı bir soru</option>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="w-fit">
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
        {savedAt && <span className="text-sm text-emerald-600">Kaydedildi ✓</span>}
      </div>
    </Card>
  );
}
