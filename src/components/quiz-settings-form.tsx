"use client";

import { useState } from "react";
import { Card, Button, Select } from "@/components/ui";
import {
  QUESTION_FONT_FAMILY_CLASSES,
  QUESTION_FONT_SIZE_CLASSES,
  type QuizDisplaySettings,
} from "@/components/question-answer-list";

type TimerMode = "one_minute" | "none" | "custom";

function modeFromInitial(timerEnabled: boolean, secondsPerQuestion: number): TimerMode {
  if (!timerEnabled) return "none";
  if (secondsPerQuestion === 60) return "one_minute";
  return "custom";
}

// Ogrencinin deneme/konu testi ekranlarindaki soru basi sure siniri ve
// gosterim bicimi tercihlerini duzenledigi form. Kaydet'e basinca
// /api/student/quiz-settings'e yazilir; sayfa yenilenince yeni deger
// deneme/konu testi ekranlarina yansir. Admin bir test ogrenciyi
// onizlerken `studentId` gecilir - o zaman kaydedilen ayar admin'in kendi
// hesabina degil, onizlenen ogrenciye yazilir.
//
// Varsayilan "Soru başına 1 dakika" secenegi - ogrenci isterse sure
// sinirini tamamen kaldirabilir ("Süre sınırı yok") ya da kendi suresini
// belirleyebilir ("Özel süre").
export function QuizSettingsForm({ initial, studentId }: { initial: QuizDisplaySettings; studentId?: string }) {
  const [timerMode, setTimerMode] = useState<TimerMode>(modeFromInitial(initial.timerEnabled, initial.secondsPerQuestion));
  const [customMinutes, setCustomMinutes] = useState(Math.max(1, Math.round(initial.secondsPerQuestion / 60)));
  const [oneQuestionPerPage, setOneQuestionPerPage] = useState(initial.oneQuestionPerPage);
  const [fontSize, setFontSize] = useState(initial.fontSize);
  const [fontFamily, setFontFamily] = useState(initial.fontFamily);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerEnabled = timerMode !== "none";
  const minutesPerQuestion = timerMode === "custom" ? customMinutes : 1;

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
          fontSize,
          fontFamily,
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
          Varsayılan olarak her soru için 1 dakika süre tanınır ve yukarıda kalan süre gösterilir; süreye tıklayarak
          da her zaman buraya dönebilirsin. İstersen süre sınırını tamamen kaldırabilir ya da kendi süreni
          belirleyebilirsin.
        </p>
        <div className="mt-3 max-w-xs">
          <Select value={timerMode} onChange={(e) => setTimerMode(e.target.value as TimerMode)}>
            <option value="one_minute">Soru başına 1 dakika (varsayılan)</option>
            <option value="none">Süre sınırı yok</option>
            <option value="custom">Özel süre belirle</option>
          </Select>
        </div>
        {timerMode === "custom" && (
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            Soru başına
            <input
              type="number"
              min={1}
              max={60}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
              className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center"
            />
            dakika
          </label>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-slate-900">Soru Gösterim Biçimi</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sorular varsayılan olarak sayfa başı bir soru şeklinde gösterilir; istersen tek sayfada aşağı kaydırarak
          gösterilecek şekilde değiştirebilirsin.
        </p>
        <div className="mt-3 max-w-xs">
          <Select
            value={oneQuestionPerPage ? "sayfa-basi-bir-soru" : "kaydirmali-liste"}
            onChange={(e) => setOneQuestionPerPage(e.target.value === "sayfa-basi-bir-soru")}
          >
            <option value="sayfa-basi-bir-soru">Sayfa başı bir soru (varsayılan)</option>
            <option value="kaydirmali-liste">Kaydırmalı liste</option>
          </Select>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-slate-900">Soru Yazı Boyutu ve Fontu</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sayfa başı bir soru gösterildiği için yazı boyutu varsayılan olarak biraz büyütülmüş gelir; istersen normale
          döndürebilir, daha da büyütebilir ya da yazı tipini değiştirebilirsin.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="max-w-xs flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">Yazı boyutu</label>
            <Select value={fontSize} onChange={(e) => setFontSize(e.target.value as QuizDisplaySettings["fontSize"])}>
              <option value="normal">Normal</option>
              <option value="large">Büyük (varsayılan)</option>
              <option value="xlarge">Çok Büyük</option>
            </Select>
          </div>
          <div className="max-w-xs flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">Yazı tipi</label>
            <Select value={fontFamily} onChange={(e) => setFontFamily(e.target.value as QuizDisplaySettings["fontFamily"])}>
              <option value="sans">Standart (varsayılan)</option>
              <option value="serif">Klasik (Serif)</option>
              <option value="mono">Eşit Aralıklı (Mono)</option>
            </Select>
          </div>
        </div>
        <div
          className={`mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 ${QUESTION_FONT_SIZE_CLASSES[fontSize].question} ${QUESTION_FONT_FAMILY_CLASSES[fontFamily]}`}
        >
          Örnek: 1. Aşağıdakilerden hangisi doğrudur?
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
