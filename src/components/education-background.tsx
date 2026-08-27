"use client";

import { useEffect, useRef } from "react";

// Anasayfa hero bolumunun arkasinda suzulen, birbirine ince cizgilerle
// baglanan matematik/fen formullerinden olusan hafif canli bir efekt.
// Disaridan kutuphane kullanmiyor (kucuk bundle, tam kontrol).
// prefers-reduced-motion aciksa hareketsiz/soluk bir kare ile birakiyoruz.

const SYMBOLS = [
  // Tekil semboller (daha sik gorunur, kisa)
  "π", "Σ", "√", "∫", "∞", "Δ", "λ", "θ", "÷", "±", "≈", "∂", "∇", "%",
  // Gercek formuller / denklemler (LGS-TYT-AYT karisimi)
  "a²+b²=c²",
  "E=mc²",
  "F=ma",
  "y=mx+b",
  "sin θ = y/r",
  "f(x)=x²",
  "∫f(x)dx",
  "H₂O",
  "PV=nRT",
  "π ≈ 3,14",
  "log₂8=3",
];

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

      const count = Math.max(14, Math.min(24, Math.round((width * height) / 42000)));
      particles = Array.from({ length: count }, () => {
        const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        // Uzun formuller kucuk, kisa semboller biraz daha buyuk yazilsin
        const isLong = symbol.length > 4;
        const size = isLong ? 11 + Math.random() * 6 : 15 + Math.random() * 11;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          symbol,
          size,
        };
      });
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
          if (dist < 150) {
            ctx.strokeStyle = `rgba(79, 70, 229, ${0.13 * (1 - dist / 150)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.font = `500 ${p.size}px system-ui, sans-serif`;
        ctx.fillStyle = "rgba(79, 70, 229, 0.22)";
        ctx.fillText(p.symbol, p.x, p.y);
      }
    }

    function step() {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -40) p.x = width + 40;
        if (p.x > width + 40) p.x = -40;
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
