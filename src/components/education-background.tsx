"use client";

import { useEffect, useRef } from "react";

// Anasayfa hero bolumunun arkasinda yavasca suzulen, birbirine ince
// cizgilerle baglanan matematik/bilim sembollerinden olusan hafif bir canli
// efekt. Disaridan kutuphane kullanmiyor (kucuk bundle, tam kontrol).
// prefers-reduced-motion aciksa hareketsiz/soluk bir kare ile birakiyoruz.

const SYMBOLS = ["π", "Σ", "√", "∫", "x²", "e=mc²", "%", "∞", "÷", "+", "λ", "Δ"];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  symbol: string;
  size: number;
};

export function EducationBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let animationFrame = 0;

    function resize() {
      if (!canvas) return;
      const parent = canvas.parentElement;
      width = parent?.clientWidth ?? window.innerWidth;
      height = parent?.clientHeight ?? 480;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(14, Math.min(28, Math.round((width * height) / 45000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        size: 14 + Math.random() * 14,
      }));
    }

    function drawFrame() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      // Yakin parcaciklari ince cizgilerle bagla
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            ctx.strokeStyle = `rgba(79, 70, 229, ${0.12 * (1 - dist / 160)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.font = `${p.size}px system-ui, sans-serif`;
        ctx.fillStyle = "rgba(79, 70, 229, 0.16)";
        ctx.fillText(p.symbol, p.x, p.y);
      }
    }

    function step() {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
      }
      drawFrame();
      animationFrame = requestAnimationFrame(step);
    }

    resize();
    drawFrame();
    window.addEventListener("resize", resize);

    if (!prefersReducedMotion) {
      animationFrame = requestAnimationFrame(step);
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
