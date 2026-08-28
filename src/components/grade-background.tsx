"use client";

import { useEffect, useState } from "react";

// Ogrenci panelinin (soru cozme dahil) arkasinda sinifa gore degisen gercek
// gorsel arka planlar. Her sinif grubunun kendi gorsel havuzu var; birden
// fazla gorseli olan gruplarda (1-4 ve 5-8) belli araliklarla rastgele baska
// bir gorsele geciliyor - "canli" ama metin/soru okunurlugunu bozmayacak
// kadar soluk. prefers-reduced-motion acirken donme durduruluyor.

export type GradeBackgroundVariant = "ilkokul" | "ortaokul" | "lise" | "default";

const IMAGES: Record<GradeBackgroundVariant, string[]> = {
  // 1-4. sinif: 3 gorsel arasinda rastgele doner
  ilkokul: ["/grade-bg/ilkokul-1.jpg", "/grade-bg/ilkokul-2.jpg", "/grade-bg/ilkokul-3.jpg"],
  // 5-8. sinif: 2 gorsel arasinda rastgele doner
  ortaokul: ["/grade-bg/ortaokul-1.jpg", "/grade-bg/ortaokul-2.jpg"],
  // 9-12. sinif: tek, sabit gorsel
  lise: ["/grade-bg/lise-1.jpg"],
  // sinifi belirtilmemis / diger kullanicilar icin tek, sabit gorsel
  default: ["/grade-bg/varsayilan.jpg"],
};

const ROTATE_MS = 45000;

export function GradeBackground({ variant }: { variant: GradeBackgroundVariant }) {
  const images = IMAGES[variant];
  const [index, setIndex] = useState(0);

  // Ilk yuklemede havuzdan rastgele bir gorselle basla.
  useEffect(() => {
    setIndex(Math.floor(Math.random() * images.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  // Birden fazla gorsel varsa belli araliklarla farkli birine gec.
  useEffect(() => {
    if (images.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      setIndex((prev) => {
        let next = Math.floor(Math.random() * images.length);
        while (images.length > 1 && next === prev) next = Math.floor(Math.random() * images.length);
        return next;
      });
    }, ROTATE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out"
          style={{ backgroundImage: `url(${src})`, opacity: i === index ? 0.28 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-white/50" />
    </div>
  );
}

export function gradeBackgroundVariant(gradeLevel: number | null | undefined): GradeBackgroundVariant {
  if (gradeLevel == null) return "default";
  if (gradeLevel <= 4) return "ilkokul";
  if (gradeLevel <= 8) return "ortaokul";
  return "lise";
}
