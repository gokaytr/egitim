"use client";

import { useEffect, useRef, useState } from "react";

// Sorunun üzerine (varsa bir şekil görseliyle birlikte) serbest çizim
// yapılabilen küçük bir "kağıt" bileşeni. Öğrenci burada dik indirebilir,
// yardımcı çizgi çekebilir, hesap yapabilir - hiçbir şey kaydedilmez,
// sadece o an ekranda kalan bir çalışma alanıdır.
export function DrawingCanvas({ backgroundImageUrl }: { backgroundImageUrl?: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const context = ctx; // non-null referans, closure'larda TS daraltmasını koru

    function resize() {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Mevcut çizimi kaybetmemek için önce görüntüyü al, boyutu değiştirip geri koy
      const prev = canvas.toDataURL();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (prev && prev.length > 100) {
        const img = new Image();
        img.onload = () => context.drawImage(img, 0, 0, rect.width, rect.height);
        img.src = prev;
      }
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true;
    lastPointRef.current = getPos(e);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const point = getPos(e);
    const last = lastPointRef.current ?? point;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 18;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 2.5;
    }
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
  }

  function handlePointerUp() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTool("pen")}
          className={`rounded-lg px-3 py-1 text-xs font-medium ${tool === "pen" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Kalem
        </button>
        <button
          type="button"
          onClick={() => setTool("eraser")}
          className={`rounded-lg px-3 py-1 text-xs font-medium ${tool === "eraser" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Silgi
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
        >
          Temizle
        </button>
        <span className="text-xs text-slate-400">Şeklin üzerine dik indirebilir, yardımcı çizgi çekebilirsin</span>
      </div>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white"
        style={{ aspectRatio: "1 / 1", maxWidth: 340 }}
      >
        {backgroundImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundImageUrl}
            alt="Soru şekli"
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
        )}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    </div>
  );
}
