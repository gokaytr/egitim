// Sinif duzeyine gore anlamli olan hedef sinavlarin listesi. Ornegin LGS
// sadece 8. sinifta, TYT/AYT/YKS/YDT lisede (9-12) anlamli; KPSS/ALES ise
// universite sonrasi sinavlar oldugu icin sadece 12. sinifta (mezuniyete
// en yakin asama) secenek olarak gosteriliyor. "DIGER" her zaman son
// secenek olarak kaliyor. Hem kayit formunda (kayit/page.tsx) hem de
// ogrenci ayarlarindaki Profil Bilgileri formunda (profile-info-form.tsx)
// ayni liste kullanilir - boylece ikisi arasinda fark olmaz.
export const ALL_EXAM_TARGETS = ["LGS", "TYT", "AYT", "YKS", "YDT", "KPSS", "ALES", "DIGER"] as const;

export function examTargetsForGrade(grade: number | null | undefined): string[] {
  if (grade == null) return [...ALL_EXAM_TARGETS];
  if (grade <= 7) return ["DIGER"];
  if (grade === 8) return ["LGS", "DIGER"];
  if (grade <= 11) return ["TYT", "AYT", "YKS", "YDT", "DIGER"];
  return ["TYT", "AYT", "YKS", "YDT", "KPSS", "ALES", "DIGER"];
}
