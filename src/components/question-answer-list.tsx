"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { DrawingCanvas } from "@/components/drawing-canvas";
import { getAudioCtx, playOptionSelect, playQuestionAdvance } from "@/lib/sound/tension-audio";

export type AnswerableQuestion = {
  id: string;
  body: string;
  options: Record<string, string>;
  image_url?: string | null;
  topicLabel?: string;
};

export type QuizFontSize = "normal" | "large" | "xlarge";
export type QuizFontFamily = "sans" | "serif" | "mono";

export type QuizDisplaySettings = {
  timerEnabled: boolean;
  secondsPerQuestion: number;
  oneQuestionPerPage: boolean;
  fontSize: QuizFontSize;
  fontFamily: QuizFontFamily;
};

// Varsayilan: soru sayisina uygun sekilde soru basina 1 dakika sure siniri
// acik gelir, sorular da sayfa basi bir soru olarak gosterilir - ogrenci
// isterse "Genel Ayarlar > Sinav Ayarlari"ndan sure sinirini kaldirabilir,
// farkli bir sure secebilir veya gosterim bicimini kaydirmali listeye
// cevirebilir. Sayfa basi tek soru gosterildigi icin yazi boyutu varsayilan
// olarak biraz buyutulmus ("large") geliyor - ogrenci isterse normal boyuta
// dondurebilir ya da daha da buyutebilir, yazi tipini de degistirebilir.
export const DEFAULT_QUIZ_DISPLAY_SETTINGS: QuizDisplaySettings = {
  timerEnabled: true,
  secondsPerQuestion: 60,
  oneQuestionPerPage: true,
  fontSize: "large",
  fontFamily: "sans",
};

// Yazi boyutu/tipi tercihine gore soru govdesi ve siklarin Tailwind
// siniflari - hem QuestionCard hem de baska bir yerde ayni haritaya
// ihtiyac duyulursa diye disari da aciliyor.
export const QUESTION_FONT_SIZE_CLASSES: Record<QuizFontSize, { question: string; option: string }> = {
  normal: { question: "text-base", option: "text-sm" },
  large: { question: "text-lg", option: "text-base" },
  xlarge: { question: "text-xl", option: "text-lg" },
};

export const QUESTION_FONT_FAMILY_CLASSES: Record<QuizFontFamily, string> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

function formatRemaining(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function QuestionCard({
  question,
  index,
  selected,
  onSelect,
  fontSize = "normal",
  fontFamily = "sans",
}: {
  question: AnswerableQuestion;
  index: number;
  selected?: string;
  onSelect: (option: string) => void;
  fontSize?: QuizFontSize;
  fontFamily?: QuizFontFamily;
}) {
  const sizeClasses = QUESTION_FONT_SIZE_CLASSES[fontSize];
  const familyClass = QUESTION_FONT_FAMILY_CLASSES[fontFamily];
  return (
    <Card>
      {question.topicLabel && (
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-indigo-500">{question.topicLabel}</p>
      )}
      <p className={`font-medium text-slate-900 ${sizeClasses.question} ${familyClass}`}>
        {index + 1}. {question.body}
      </p>
      {question.image_url && <DrawingCanvas backgroundImageUrl={question.image_url} />}
      <div className="mt-3 flex flex-col gap-2">
        {Object.entries(question.options).map(([key, val]) => (
          <label
            key={key}
            className={`flex touch-manipulation cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 active:bg-slate-50 ${sizeClasses.option} ${familyClass} ${
              selected === key ? "border-indigo-500 bg-indigo-50" : "border-slate-200"
            }`}
          >
            <input
              type="radio"
              name={question.id}
              className="accent-indigo-600"
              checked={selected === key}
              onChange={() => onSelect(key)}
            />
            <span>
              {key}) {val}
            </span>
          </label>
        ))}
      </div>
    </Card>
  );
}

// Deneme (sinav) ve konu testi ekranlarinin ortak soru listesi/soru kagidi
// gorunumu. Ogrenci "Genel Ayarlar > Sinav Ayarlari"ndan iki seyi
// degistirebilir: soru basi sure siniri (varsayilan kapali, acilirsa soru
// basi 1 dk) ve gosterim bicimi (varsayilan: hepsi tek sayfada kaydirmali
// liste; alternatif: sayfa basi bir soru, cevaplayinca "Sonraki Soru" ile
// ilerlenir). Sure rozetine tiklamak da dogrudan ayni ayar sayfasina goturur.
export function QuestionAnswerList({
  questions,
  answers,
  onAnswer,
  settings,
  settingsHref = "/ogrenci/genel-ayarlar",
  onFinish,
  finishing,
  finishLabel,
}: {
  questions: AnswerableQuestion[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, option: string) => void;
  settings: QuizDisplaySettings;
  settingsHref?: string;
  // Verilirse "Testi Bitir" / "Denemeyi Bitir" butonu artik cagiran tarafta
  // ayri gosterilmez - sayfa basi bir soru modunda son sorudaki "Sonraki
  // Soru" ile ayni sirada/mantikta (en sagda), tam liste modunda ise
  // listenin altinda sagda gosterilir.
  onFinish?: () => void;
  finishing?: boolean;
  finishLabel?: string;
}) {
  const totalSeconds = questions.length * settings.secondsPerQuestion;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [pageIndex, setPageIndex] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Bir sik secildiginde kisa bir onay sesi, sayfa/soru ilerledikce
  // (Sonraki Soru/Atla) farkli kisa bir gecis sesi caliyoruz - ikisi de
  // Web Audio API ile aninda sentezleniyor (dosya yok), bkz.
  // lib/sound/tension-audio.ts.
  function handleAnswer(questionId: string, option: string) {
    const ctx = getAudioCtx(audioCtxRef);
    if (ctx) playOptionSelect(ctx);
    onAnswer(questionId, option);
  }

  function handleAdvance() {
    const ctx = getAudioCtx(audioCtxRef);
    if (ctx) playQuestionAdvance(ctx);
    setPageIndex((i) => Math.min(questions.length - 1, i + 1));
  }

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (!settings.timerEnabled) return;
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [settings.timerEnabled, totalSeconds]);

  useEffect(
    () => () => {
      audioCtxRef.current?.close().catch(() => {});
    },
    []
  );

  const timeIsLow = settings.timerEnabled && remaining <= 30;

  // Kalan süre rozeti artik normal akista degil - sayfanin sag ust
  // kosesinde (arka plandaki gorselin uzerinde), sabit konumda yuzuyor.
  const timerBadge = settings.timerEnabled ? (
    <Link
      href={settingsHref}
      title="Süre ayarlarını değiştirmek için tıkla"
      className={`fixed right-4 top-16 z-20 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur-sm transition sm:right-6 sm:top-20 lg:right-10 lg:top-24 ${
        timeIsLow ? "border-red-300 bg-red-50/90 text-red-700" : "border-indigo-200 bg-indigo-50/90 text-indigo-700"
      }`}
    >
      ⏱ Kalan süre: {formatRemaining(remaining)}
    </Link>
  ) : null;

  const finishButton = onFinish ? (
    <Button onClick={onFinish} disabled={finishing}>
      {finishing ? "Değerlendiriliyor..." : (finishLabel ?? "Testi Bitir")}
    </Button>
  ) : null;

  if (settings.oneQuestionPerPage) {
    const question = questions[pageIndex];
    if (!question) return null;
    const hasAnswer = !!answers[question.id];
    const isLast = pageIndex === questions.length - 1;
    return (
      <div className="flex flex-col gap-4">
        {timerBadge}
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Soru {pageIndex + 1} / {questions.length}
        </p>
        <QuestionCard
          question={question}
          index={pageIndex}
          selected={answers[question.id]}
          onSelect={(key) => handleAnswer(question.id, key)}
          fontSize={settings.fontSize}
          fontFamily={settings.fontFamily}
        />
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" onClick={() => setPageIndex((i) => Math.max(0, i - 1))} disabled={pageIndex === 0}>
            ← Önceki Soru
          </Button>
          {isLast
            ? finishButton
            : (
              <Button variant={hasAnswer ? "primary" : "secondary"} onClick={handleAdvance}>
                {hasAnswer ? "Sonraki Soru →" : "Soruyu Atla →"}
              </Button>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {timerBadge}
      {questions.map((q, i) => (
        <QuestionCard
          key={q.id}
          question={q}
          index={i}
          selected={answers[q.id]}
          onSelect={(key) => handleAnswer(q.id, key)}
          fontSize={settings.fontSize}
          fontFamily={settings.fontFamily}
        />
      ))}
      {finishButton && <div className="flex justify-end">{finishButton}</div>}
    </div>
  );
}
