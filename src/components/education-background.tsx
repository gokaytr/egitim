"use client";

import { useEffect, useRef } from "react";

// Anasayfa hero bolumunun arkasinda suzulen, birbirine ince cizgilerle
// baglanan matematik/fen formullerinden olusan canli bir efekt. Disaridan
// kutuphane kullanmiyor (kucuk bundle, tam kontrol). prefers-reduced-motion
// aciksa hareketsiz/soluk bir kare ile birakiyoruz.

const SYMBOLS = [
  // Tekil semboller
  "π", "Σ", "√", "∫", "∞", "Δ", "λ", "θ", "÷", "±", "≈", "≠", "≤", "≥", "∂", "∇", "%",
  // Gercek formuller / denklemler (LGS-TYT-AYT karisimi: matematik, fizik, kimya)
  "a²+b²=c²",
  "x²+y²=r²",
  "E=mc²",
  "F=ma",
  "y=mx+b",
  "√2 ≈ 1,41",
  "sin θ = y/r",
  "cos θ = x/r",
  "f(x)=x²",
  "∫f(x)dx",
  "lim x→∞",
  "n!",
  "H₂O",
  "PV=nRT",
  "V=IR",
  "d=v·t",
  "π ≈ 3,14",
  "log₂8=3",
  "aˣ·aʸ=aˣ⁺ʸ",
  "Σ(1..n)",
];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  symbol: string;
  size: number;
  weight: number;
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

      const count = Math.max(24, Math.min(46, Math.round((width * height) / 26000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        size: 15 + Math.random() * 16,
        weight: Math.random() < 0.5 ? 600 : 700,
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
          if (dist < 170) {
            ctx.strokeStyle = `rgba(79, 70, 229, ${0.2 * (1 - dist / 170)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.font = `${p.weight} ${p.size}px system-ui, sans-serif`;
        ctx.fillStyle = "rgba(67, 56, 202, 0.38)";
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
