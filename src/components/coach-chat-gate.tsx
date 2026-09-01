"use client";

import { usePathname } from "next/navigation";
import { CoachChat } from "@/components/coach-chat";
import type { CoachContext } from "@/lib/coach/responses";

// Koc Pusula balonu sag alt kosede sabit duruyor; mobilde konu testi ve
// deneme ekranlarindaki "Onceki Soru / Sonraki Soru" butonlariyla ayni
// bolgede ust uste biniyordu. Soru cozulurken (konu testi ve deneme
// ekranlarinda) balonu tamamen gizleyip, diger tum ekranlarda (dashboard,
// dersler, gecmis sonuclar, cevap anahtari vb.) oldugu gibi gosteriyoruz.
const HIDDEN_ON = [/^\/ogrenci\/konu\/[^/]+\/?$/, /^\/ogrenci\/deneme\/[^/]+\/?$/];

export function CoachChatGate({ context }: { context: CoachContext }) {
  const pathname = usePathname();
  const hidden = HIDDEN_ON.some((re) => re.test(pathname ?? ""));
  if (hidden) return null;
  return <CoachChat context={context} />;
}
