"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";

// Ogretmen olarak kayit olup admin onayi bekleyen kullanicilarin yonlendirildigi sayfa.
// Middleware bu kullanicilari (teacher_pending = true) baska hicbir korumali sayfaya
// birakmiyor, admin onaylayana kadar burada kaliyorlar.
export default function BasvuruBekleniyorPage() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/giris");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
          🕒
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Öğretmen başvurun inceleniyor</h1>
        <p className="mt-2 text-sm text-slate-500">
          Kaydın alındı. Yönetici ekibimiz başvurunu onayladıktan sonra öğretmen paneline
          erişebileceksin. Onaylandığında tekrar giriş yapman yeterli.
        </p>
        <Button variant="secondary" className="mt-6" onClick={handleLogout}>
          Çıkış yap
        </Button>
      </Card>
    </div>
  );
}
