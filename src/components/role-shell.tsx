"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GradeBackground } from "@/components/grade-background";
import { gradeBackgroundVariant } from "@/lib/grade-level";

type NavItem = { href: string; label: string; tone?: "default" | "accent" | "emerald" | "amber"; dot?: boolean; badge?: string };

// Genel Ayarlar sayfasi rolden role farkli bir rotada yasiyor - ogrenci ve
// veli ayni /ogrenci/genel-ayarlar sayfasini (icerigi role gore degisiyor)
// paylasiyor.
const SETTINGS_HREF_BY_ROLE: Record<string, string> = {
  admin: "/admin/genel-ayarlar",
  student: "/ogrenci/genel-ayarlar",
  parent: "/ogrenci/genel-ayarlar",
  teacher: "/ogretmen/genel-ayarlar",
};

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = pathname === item.href;
        const inactiveTone =
          item.tone === "emerald"
            ? "bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100"
            : item.tone === "amber"
              ? "bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100"
              : "text-slate-800 hover:bg-slate-100";
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? "bg-indigo-50 text-indigo-700" : inactiveTone
            }`}
          >
            <span className="flex items-center gap-1.5">
              {item.label}
              {item.dot && (
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" aria-label="Onay bekleyen soru var" />
              )}
            </span>
            {item.badge && <span className="text-xs font-normal text-slate-400">{item.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function RoleShell({
  title,
  navItems,
  children,
  navItemsByRole,
  titleByRole,
  topBarLinks,
  showGradeBackground,
  gradeLevel,
  previewSwitcher,
  previewSwitcherByRole,
}: {
  title: string;
  navItems: NavItem[];
  children: ReactNode;
  navItemsByRole?: Partial<Record<string, NavItem[]>>;
  titleByRole?: Partial<Record<string, string>>;
  topBarLinks?: NavItem[];
  showGradeBackground?: boolean;
  // Arka plandaki sinif temali gorselin hangi varyantini (ilkokul/ortaokul/
  // lise) gosterecegini belirleyen sinif duzeyi - cagiran taraftan (server
  // component) geliyor. Boylece admin bir test ogrenciyi onizlerken bu
  // deger ADMIN'in kendi (bos) grade_level'i degil, ONIZLENEN ogrencinin
  // sinif duzeyi olur. Verilmezse arka plan gorseli gosterilmez.
  gradeLevel?: number | null;
  // Admin bir paneli (ogrenci/ogretmen/veli) onizlerken sol menude "Cikis
  // yap" butonunun ustunde gosterilecek test kullanici secici. Tek rollu
  // sayfalar (orn. ogretmen) icin previewSwitcher, birden fazla rolu ayni
  // layout icinde onizleyen sayfalar (orn. ogrenci - hem ogrenci hem veli
  // gorunumu) icin previewSwitcherByRole kullanilir.
  previewSwitcher?: ReactNode;
  previewSwitcherByRole?: Partial<Record<string, ReactNode>>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Soru cozme ekranlarina (deneme/konu testi) girildiginde odaklanmayi
  // kolaylastirmak icin sol menu varsayilan olarak daraltiliyor - ama
  // ogrenci isterse daraltma butonuyla istedigi an genisletip kapatabiliyor.
  const [sidebarOverride, setSidebarOverride] = useState<boolean | null>(null);
  const isQuestionSolvingRoute = /^\/ogrenci\/(deneme|konu)\//.test(pathname);
  const sidebarCollapsed = sidebarOverride ?? isQuestionSolvingRoute;

  // Admin, ogrenci/ogretmen panellerini onizlerken (kendi paneli disinda
  // gezinirken) ust tarafta admin paneline donme baglantisi gosteriyoruz.
  // Ayni cagriyla, rol bazli baslik/nav degistirmek icin de rolu tutuyoruz.
  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (cancelled) return;
      setCurrentRole(profile?.role ?? null);
    }
    loadRole();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Sayfa degistiginde mobil menu aciksa kapat.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Yeni bir sayfaya gecince sol menunun daraltilmis/genisletilmis
  // durumundaki manuel tercih sifirlanir - boylece her soru cozme
  // ekraninda otomatik daraltma yeniden devreye girer.
  useEffect(() => {
    setSidebarOverride(null);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/giris");
    router.refresh();
  }

  // Admin bir onizleme sayfasindaysa (orn. /ogrenci/rapor) nav/baslik admin'in
  // kendi rolune gore degil, hangi paneli onizledigine gore secilmeli - yoksa
  // veli/ogretmen ekranlarinda hep admin'in kendi (kisitli) nav'i gorunuyordu.
  const effectiveRole =
    currentRole === "admin"
      ? pathname.startsWith("/ogrenci/rapor")
        ? "parent"
        : pathname.startsWith("/ogretmen")
          ? "teacher"
          : pathname.startsWith("/ogrenci")
            ? "student"
            : "admin"
      : currentRole;

  const roleTitle = effectiveRole ? titleByRole?.[effectiveRole] : undefined;
  const displayTitle = roleTitle ?? title;
  const roleNav = effectiveRole ? navItemsByRole?.[effectiveRole] : undefined;
  const displayNav = roleNav ?? navItems;
  // Sol ust logo/ikona tiklaninca donulecek "ana sayfa" - her rolun kendi
  // nav listesindeki ilk oge zaten o rolun genel bakis sayfasi (ör. /admin,
  // /ogrenci, /ogretmen, veli icin /ogrenci/rapor).
  const homeHref = displayNav[0]?.href ?? "/";
  const activePreviewSwitcher = effectiveRole ? previewSwitcherByRole?.[effectiveRole] : undefined;
  const displayPreviewSwitcher = activePreviewSwitcher ?? previewSwitcher;

  // Genel Ayarlar artik sol menude degil, her rolde sag ust kosede tek bir
  // dişli ikonuyla erisiliyor. Admin kendi panelindeyken kendi ayarlarina,
  // bir paneli onizlerken ise onizledigi rolun ayar sayfasina gider.
  const settingsHref = effectiveRole ? SETTINGS_HREF_BY_ROLE[effectiveRole] : undefined;
  const settingsButton = settingsHref ? (
    <Link
      href={settingsHref}
      title="Genel Ayarlar"
      aria-label="Genel Ayarlar"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
        pathname === settingsHref
          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
          : "border-slate-300 text-slate-700 hover:bg-slate-100"
      }`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        <path
          fillRule="evenodd"
          d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
          clipRule="evenodd"
        />
      </svg>
    </Link>
  ) : null;

  // Cikis butonu artik sol menu yerine sag ust kosede, ayarlar ikonunun
  // hemen saginda gosteriliyor.
  const logoutButton = (
    <button
      onClick={handleLogout}
      title="Çıkış yap"
      aria-label="Çıkış yap"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        <path
          fillRule="evenodd"
          d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z"
          clipRule="evenodd"
        />
        <path
          fillRule="evenodd"
          d="M6 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H6.75A.75.75 0 0 1 6 10Z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );

  // Admin icin (ister kendi panelinde ister bir test panelini onizlerken)
  // her zaman diger 3 panele tek tikla gecis butonlari gosteriliyor - eskiden
  // sadece "Admin paneline geçiş yap" vardi ve sadece onizlerken cikiyordu.
  const PANEL_DEFS: { key: string; label: string; href: string }[] = [
    { key: "admin", label: "Admin paneline geç", href: "/admin" },
    { key: "student", label: "Demo öğrenci paneline geç", href: "/ogrenci" },
    { key: "teacher", label: "Demo öğretmen paneline geç", href: "/ogretmen" },
    { key: "parent", label: "Demo veli paneline geç", href: "/ogrenci/rapor" },
  ];
  const otherPanels = currentRole === "admin" ? PANEL_DEFS.filter((p) => p.key !== effectiveRole) : [];
  function renderPanelSwitcher(onNavigate?: () => void) {
    if (currentRole !== "admin") return null;
    return (
      <>
        {displayPreviewSwitcher}
        {otherPanels.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Panel değiştir</p>
            {otherPanels.map((p) => (
              <Link
                key={p.key}
                href={p.href}
                onClick={onNavigate}
                className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              >
                {p.label}
              </Link>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Mobilde ust bar: logo + hamburger. Sol menu md ve ustunde sabit
          gorunur, mobilde ise gizli - bunun yerine bu bar ve acilir menu
          kullanicinin tek erisim yolu. */}
      <div className="relative z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Link href={homeHref} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">O</div>
          <div>
            <span className="block text-base font-semibold leading-tight">Odak</span>
            <span className="block text-[11px] leading-tight text-slate-400">{displayTitle}</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {settingsButton}
          {logoutButton}
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={mobileNavOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
          >
            {mobileNavOpen ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L8.94 10l-4.72 4.72a.75.75 0 101.06 1.06L10 11.06l4.72 4.72a.75.75 0 101.06-1.06L11.06 10l4.72-4.72a.75.75 0 00-1.06-1.06L10 8.94 5.28 4.22z" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M3 5.75A.75.75 0 013.75 5h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 5.75zM3 10a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 10zm0 4.25a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobil acilir menu (overlay + panel) */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-white p-5 shadow-xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{displayTitle}</p>
            <NavLinks items={displayNav} pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
            <div className="mt-auto flex flex-col gap-3 pt-4">
              {renderPanelSwitcher(() => setMobileNavOpen(false))}
            </div>
          </div>
        </div>
      )}

      <aside
        className={`sticky top-0 z-20 hidden h-dvh shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white lg:flex ${
          sidebarCollapsed ? "w-16 items-center p-3" : "w-64 p-5"
        }`}
      >
        {sidebarCollapsed ? (
          <>
            <Link href={homeHref} className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              O
            </Link>
            <button
              onClick={() => setSidebarOverride(false)}
              aria-label="Menüyü genişlet"
              title="Menüyü genişlet"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              ›
            </button>
          </>
        ) : (
          <>
            <div className="mb-8 flex items-center justify-between gap-2">
              <Link href={homeHref} className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">O</div>
                <span className="text-lg font-semibold">Odak</span>
              </Link>
              <button
                onClick={() => setSidebarOverride(true)}
                aria-label="Menüyü daralt"
                title="Menüyü daralt"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                ‹
              </button>
            </div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{displayTitle}</p>
            <NavLinks items={displayNav} pathname={pathname} />
            <div className="mt-auto flex flex-col gap-3 pt-4">{renderPanelSwitcher()}</div>
          </>
        )}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* lg altinda dişli/çıkış zaten mobil ust barda (logo + hamburger
            yaninda) gosteriliyor; bu satir sadece "Öğrenci Ekranı" gibi
            ekstra baglantilar varsa mobilde de gorunur, dişli/çıkış ikonlari
            ise sadece lg ve ustunde burada tekrar gosterilir. */}
        <div
          className={
            topBarLinks?.length
              ? "flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-end lg:px-6"
              : "hidden items-center justify-end gap-3 px-4 py-3 lg:flex lg:px-6"
          }
        >
          {!!topBarLinks?.length && (
            <div className="flex flex-wrap items-center gap-2">
              {topBarLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    link.tone === "accent"
                      ? "rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                      : "rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  }
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
          <div className="hidden items-center gap-2 lg:flex">
            {settingsButton}
            {logoutButton}
          </div>
        </div>
        <main className="relative flex-1 overflow-hidden bg-slate-50 p-4 sm:p-6 lg:p-10">
          {showGradeBackground && effectiveRole === "student" && (
            <GradeBackground variant={gradeBackgroundVariant(gradeLevel ?? null)} />
          )}
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
