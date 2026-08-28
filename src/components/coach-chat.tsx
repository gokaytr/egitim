"use client";

import { useEffect, useRef, useState } from "react";
import { detectCategory, pickResponse, type CoachCategory, type CoachContext } from "@/lib/coach/responses";

type Message = { from: "coach" | "ben"; text: string };

const MOOD_BUTTONS: { emoji: string; label: string; category: CoachCategory }[] = [
  { emoji: "😊", label: "Mutluyum", category: "mutlu" },
  { emoji: "😌", label: "Sakinim", category: "sakin" },
  { emoji: "😴", label: "Yorgunum", category: "yorgun" },
  { emoji: "😰", label: "Stresliyim", category: "stresli" },
  { emoji: "😔", label: "Üzgünüm", category: "uzgun" },
  { emoji: "😤", label: "Sıkıldım", category: "sinirli" },
];

// Ogrencinin serbest metnindeki calisma/basari ile ilgili basit ipuclarini
// yakalayip uygun kategoriye yonlendiren ikinci bir katman - detectCategory
// (mood anahtar kelimeleri) hicbir sey bulamazsa devreye girer.
function detectSecondary(text: string, ctx: CoachContext): CoachCategory {
  const t = text.toLocaleLowerCase("tr-TR");
  if (/ne çalış|hangi konu|program|ödev|görev/.test(t)) return "calisma_hatirlatma";
  if (/başardım|kazandım|çözdüm|bitirdim|tamamladım/.test(t)) return ctx.basari !== "-" && Number(ctx.basari) >= 70 ? "basari_kutlama" : "mutlu";
  if (/kötü gitti|yapamadım|çözemedim|yanlış yaptım/.test(t)) return "destek_dusuk_basari";
  if (/güle güle|hoşça kal|görüşürüz|kapatıyorum|çıkıyorum/.test(t)) return "vedalasma";
  return "genel_motivasyon";
}

export function CoachChat({ context }: { context: CoachContext }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = pickResponse("karsilama", context);
      const followUp =
        context.konu !== "-"
          ? pickResponse("calisma_hatirlatma", context)
          : Number(context.basari) >= 70
            ? pickResponse("basari_kutlama", context)
            : pickResponse("genel_motivasyon", context);
      setMessages([
        { from: "coach", text: greeting },
        { from: "coach", text: followUp },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function respond(category: CoachCategory) {
    setTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: "coach", text: pickResponse(category, context) }]);
      setTyping(false);
    }, 550);
  }

  function handleMood(category: CoachCategory, label: string) {
    setMessages((prev) => [...prev, { from: "ben", text: label }]);
    respond(category);
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { from: "ben", text }]);
    setInput("");
    const category = detectCategory(text) ?? detectSecondary(text, context);
    respond(category);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧭</span>
              <div>
                <p className="text-sm font-semibold leading-tight">Koç Pusula</p>
                <p className="text-[11px] leading-tight text-indigo-100">Senin yol arkadaşın</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Kapat" className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white">
              ✕
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "ben" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                    m.from === "ben" ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400">Koç Pusula yazıyor…</div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-white px-3 py-2">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {MOOD_BUTTONS.map((m) => (
                <button
                  key={m.category}
                  onClick={() => handleMood(m.category, `${m.emoji} ${m.label}`)}
                  className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Bir şeyler yaz..."
                className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              />
              <button
                onClick={handleSend}
                aria-label="Gönder"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-700"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
        >
          <span className="text-lg">🧭</span> Koç Pusula
        </button>
      )}
    </div>
  );
}
