"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GradeBackground } from "@/components/grade-background";
import { gradeBackgroundVariant } from "@/lib/grade-level";

type NavItem = { href: string; label: string; tone?: "default" | "accent" | "emerald" | "amber"; dot?: boolean; badge?: string };

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
            ? "text-emerald-700 hover:bg-emerald-50"
            : item.tone === "amber"
              ? "text-amber-700 hover:bg-amber-50"
              : "text-slate-600 hover:bg-slate-100";
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
  helpHref,
  navItemsByRole,
  titleByRole,
  topBarLinks,
  showGradeBackground,
}: {
  title: string;
  navItems: NavItem[];
  children: ReactNode;
  helpHref?: string;
  navItemsByRole?: Partial<Record<string, NavItem[]>>;
  titleByRole?: Partial<Record<string, string>>;
  topBarLinks?: NavItem[];
  showGradeBackground?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdminPreviewing, setIsAdminPreviewing] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [gradeLevel, setGradeLevel] = useState<number | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
      const { data: profile } = await supabase.from("profiles").select("role, grade_level").eq("id", user.id).single();
      if (cancelled) return;
      setCurrentRole(profile?.role ?? null);
      setGradeLevel(profile?.grade_level ?? null);
      if (profile?.role === "admin" && !pathname.startsWith("/admin")) {
        setIsAdminPreviewing(true);
      }
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/giris");
    router.refresh();
  }

  // Admin bir onizleme sayfasindaysa (orn. /ogrenci/rapor) nav/baslik admin'in
  // kendi rolune gore degil, hangi paneli onizledigine gore secilmeli - yoksa
  // veli/ogretmen ekranlarinda hep admin'in kendi (kisitli) nav'i gorunuyordu.
  const effectiveRole =
    currentRole === "admin" && isAdminPreviewing
      ? pathname.startsWith("/ogrenci/rapor")
        ? "parent"
        : pathname.startsWith("/ogretmen")
          ? "teacher"
          : pathname.startsWith("/ogrenci")
            ? "student"
            : currentRole
      : currentRole;

  const roleTitle = effectiveRole ? titleByRole?.[effectiveRole] : undefined;
  const displayTitle = roleTitle ?? title;
  const roleNav = effectiveRole ? navItemsByRole?.[effectiveRole] : undefined;
  const displayNav = roleNav ?? navItems;
  // Sol ust logo/ikona tiklaninca donulecek "ana sayfa" - her rolun kendi
  // nav listesindeki ilk oge zaten o rolun genel bakis sayfasi (ör. /admin,
  // /ogrenci, /ogretmen, veli icin /ogrenci/rapor).
  const homeHref = displayNav[0]?.href ?? "/";

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Mobilde ust bar: logo + hamburger. Sol menu md ve ustunde sabit
          gorunur, mobilde ise gizli - bunun yerine bu bar ve acilir menu
          kullanicinin tek erisim yolu. */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Link href={homeHref} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">O</div>
          <div>
            <span className="block text-base font-semibold leading-tight">Odak</span>
            <span className="block text-[11px] leading-tight text-slate-400">{displayTitle}</span>
          </div>
        </Link>
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

      {/* Mobil acilir menu (overlay + panel) */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-white p-5 shadow-xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{displayTitle}</p>
            <NavLinks items={displayNav} pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
            <button
              onClick={handleLogout}
              className="mt-auto rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              Çıkış yap
            </button>
          </div>
        </div>
      )}

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-5 lg:flex">
        <Link href={homeHref} className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">O</div>
          <span className="text-lg font-semibold">Odak</span>
        </Link>
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{displayTitle}</p>
        <NavLinks items={displayNav} pathname={pathname} />
        <button
          onClick={handleLogout}
          className="mt-auto rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          Çıkış yap
        </button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {(isAdminPreviewing || helpHref || topBarLinks?.length) && (
          <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div>
              {isAdminPreviewing && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
                  <span>Bu paneli admin olarak önizliyorsun.</span>
                  <Link href="/admin" className="font-medium underline">
                    Admin paneline dön
                  </Link>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {topBarLinks?.map((link) => (
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
              {helpHref && (
              <Link
                href={helpHref}
                title="Sistem Bilgisi"
                aria-label="Sistem Bilgisi"
                className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M18 10A8 8 0 112 10a8 8 0 0116 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9zm1-3a1 1 0 100 2 1 1 0 000-2z"
                    clipRule="evenodd"
                  />
                </svg>
                Sistem Bilgisi
              </Link>
              )}
            </div>
          </div>
        )}
        <main className="relative flex-1 overflow-hidden bg-slate-50 p-4 sm:p-6 lg:p-10">
          {showGradeBackground && currentRole === "student" && (
            <GradeBackground variant={gradeBackgroundVariant(gradeLevel)} />
          )}
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
