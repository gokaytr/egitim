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

// Anasayfadaki koyu ikinci sira (sinav turleri + "Ucretsiz Basla") sadece
// anasayfada anlamli oldugu icin, diger sayfalarda (panel ici, giris/kayit
// vb.) gizleniyor - bu bilgi sunucu tarafinda page.tsx'ten geliyor.
const SECTION_LINKS = [
  { href: "#ozellikler", label: "Özellikler" },
  { href: "#sinavlar", label: "Sınavlar" },
  { href: "#veliler", label: "Veliler İçin" },
];

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
  showSectionNav = false,
}: {
  initialIsLoggedIn: boolean;
  initialPanelHref: string | null;
  initialPanelLabel: string;
  showSectionNav?: boolean;
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
    <header className="sticky top-0 z-50">
      {/* Ust sira: logo + giris/kayit ya da panel/cikis butonlari - kurumsal
          referans tasarimdaki gibi beyaz zemin, koyu/net metin. */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 md:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-base font-extrabold text-white">
            O
          </div>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">ODAK</span>
        </Link>

        {/* Masaustu: giris/kayit ya da panel/cikis butonlari dogrudan gorunur */}
        <div className="hidden items-center gap-2 sm:flex sm:gap-3">
          {isLoggedIn ? (
            <>
              <Link href={panelHref!} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                {panelLabel}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-md px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Çıkış yap
              </button>
            </>
          ) : (
            <>
              <Link href="/giris" className="rounded-md px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Giriş yap
              </Link>
              <Link href="/kayit" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
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
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 sm:hidden"
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
      </div>

      {/* Ikinci, koyu sira: yalnizca anasayfada gosteriliyor (showSectionNav).
          Referans tasarimdaki (DJI Agriculture) koyu alt-navigasyon serididen
          esinlenildi - sayfa ici bolumlere kisayol + belirgin mavi CTA. */}
      {showSectionNav && (
        <div className="hidden items-center justify-between bg-slate-900 px-10 py-3 sm:flex">
          <span className="text-xs font-bold tracking-[0.2em] text-slate-400">SINAV HAZIRLIK PLATFORMU</span>
          <nav className="flex items-center gap-7">
            {SECTION_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-semibold text-slate-200 hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      )}

      {mobileOpen && (
        <div className="absolute inset-x-0 top-full border-b border-slate-200 bg-white p-4 shadow-lg sm:hidden">
          <div className="flex flex-col gap-2">
            {showSectionNav &&
              SECTION_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {l.label}
                </a>
              ))}
            {isLoggedIn ? (
              <>
                <Link
                  href={panelHref!}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md bg-blue-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-800"
                >
                  {panelLabel}
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-md px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Çıkış yap
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/giris"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Giriş yap
                </Link>
                <Link
                  href="/kayit"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md bg-blue-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-800"
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
