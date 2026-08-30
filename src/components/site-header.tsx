"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// giris/page.tsx ve middleware.ts'teki ROLE_HOME ile ayni esleme - middleware
// server-only import'lar icerdigi icin buradan dogrudan import edilemiyor,
// kucuk bir kopyasi yeterli (roller degisirse ucu de guncellenmeli).
const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  teacher: "/ogretmen",
  moderator: "/ogretmen",
  student: "/ogrenci",
  parent: "/ogrenci/rapor",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Yönetici paneli",
  teacher: "Öğretmen paneli",
  moderator: "Öğretmen paneli",
  student: "Öğrenci paneli",
  parent: "Veli paneli",
};

// Anasayfa (server component) oturumu SSR sirasinda cozup baslangic
// degerlerini buraya prop olarak geciriyor - boylece ilk render'da dogrudan
// dogru durum (giris yapilmis/yapilmamis) gosteriliyor, "once cikis
// yap/ucretsiz basla, sonra birden panel butonuna donusme" yanip sonme
// sorunu olmuyor. useEffect + onAuthStateChange hala calisir, ama sadece
// arka planda (baska sekmede giris/cikis gibi) degisiklikleri yakalamak
// icin - ilk boyamada zaten dogru deger ekranda.
export function SiteHeader({
  initialIsLoggedIn,
  initialPanelHref,
  initialPanelLabel,
}: {
  initialIsLoggedIn: boolean;
  initialPanelHref: string | null;
  initialPanelLabel: string;
}) {
  const [panelHref, setPanelHref] = useState<string | null>(initialIsLoggedIn ? initialPanelHref : null);
  const [panelLabel, setPanelLabel] = useState<string>(initialPanelLabel);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setPanelHref(null);
        }
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (cancelled) return;
      const role = profile?.role ?? null;
      setPanelHref(role ? ROLE_HOME[role] ?? "/ogrenci" : "/ogrenci");
      setPanelLabel(role ? ROLE_LABEL[role] ?? "Panelim" : "Panelim");
    }

    // Baska bir sekmede giris/cikis yapilirsa ya da oturum yenilenirse
    // anasayfa acikken bile buton durumu guncellensin. Ilk yuklemede
    // server'dan gelen baslangic degeri zaten dogru oldugu icin burada
    // tekrar sorgulamiyoruz - sadece sonraki degisiklikleri dinliyoruz.
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadSession();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setPanelHref(null);
    setMobileOpen(false);
    window.location.href = "/";
  }

  const isLoggedIn = !!panelHref;

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200/70 bg-white/70 px-6 py-5 backdrop-blur md:px-16">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">O</div>
        <span className="text-lg font-semibold">Odak</span>
      </div>

      {/* Masaustu: giris/kayit ya da panel/cikis butonlari dogrudan gorunur */}
      <div className="hidden items-center gap-2 sm:flex sm:gap-3">
        {isLoggedIn ? (
          <>
            <Link href={panelHref!} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              {panelLabel}
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Çıkış yap
            </button>
          </>
        ) : (
          <>
            <Link href="/giris" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Giriş yap
            </Link>
            <Link href="/kayit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Ücretsiz başla
            </Link>
          </>
        )}
      </div>

      {/* Mobil: butonlari dogrudan sigdirmak yerine hamburger menu arkasina
          topluyoruz - boylece giris/cikis, panel gibi durumlar tek bir acilir
          menude derli toplu goruniyor. */}
      <button
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
        aria-expanded={mobileOpen}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 sm:hidden"
      >
        {mobileOpen ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L8.94 10l-4.72 4.72a.75.75 0 101.06 1.06L10 11.06l4.72 4.72a.75.75 0 101.06-1.06L11.06 10l4.72-4.72a.75.75 0 00-1.06-1.06L10 8.94 5.28 4.22z" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path
              fillRule="evenodd"
              d="M3 5.75A.75.75 0 013.75 5h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 5.75zM3 10a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 10zm0 4.25a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {mobileOpen && (
        <div className="absolute inset-x-0 top-full border-b border-slate-200 bg-white p-4 shadow-lg sm:hidden">
          <div className="flex flex-col gap-2">
            {isLoggedIn ? (
              <>
                <Link
                  href={panelHref!}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700"
                >
                  {panelLabel}
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Çıkış yap
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/giris"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Giriş yap
                </Link>
                <Link
                  href="/kayit"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Ücretsiz başla
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
