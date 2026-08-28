"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GradeBackground, gradeBackgroundVariant } from "@/components/grade-background";

type NavItem = { href: string; label: string; tone?: "default" | "accent" };

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

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 flex-col overflow-y-auto border-r border-slate-200 bg-white p-5 md:flex">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">O</div>
          <span className="text-lg font-semibold">Odak</span>
        </div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{displayTitle}</p>
        <nav className="flex flex-col gap-1">
          {displayNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === item.href
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-auto rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          Çıkış yap
        </button>
      </aside>
      <div className="flex flex-1 flex-col">
        {(isAdminPreviewing || helpHref || topBarLinks?.length) && (
          <div className="flex items-center justify-between px-6 py-3">
            <div>
              {isAdminPreviewing && (
                <div className="flex items-center gap-3 rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
                  <span>Bu paneli admin olarak önizliyorsun.</span>
                  <Link href="/admin" className="font-medium underline">
                    Admin paneline dön
                  </Link>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
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
        <main className="relative flex-1 overflow-hidden bg-slate-50 p-6 md:p-10">
          {showGradeBackground && currentRole === "student" && (
            <GradeBackground variant={gradeBackgroundVariant(gradeLevel)} />
          )}
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
