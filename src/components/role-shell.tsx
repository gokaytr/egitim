"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type NavItem = { href: string; label: string };

export function RoleShell({
  title,
  navItems,
  children,
}: {
  title: string;
  navItems: NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdminPreviewing, setIsAdminPreviewing] = useState(false);

  // Admin, ogrenci/ogretmen panellerini onizlerken (kendi paneli disinda
  // gezinirken) ust tarafta admin paneline donme baglantisi gosteriyoruz.
  useEffect(() => {
    let cancelled = false;
    async function checkAdminPreview() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (!cancelled && profile?.role === "admin" && !pathname.startsWith("/admin")) {
        setIsAdminPreviewing(true);
      }
    }
    checkAdminPreview();
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

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 flex-col overflow-y-auto border-r border-slate-200 bg-white p-5 md:flex">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">O</div>
          <span className="text-lg font-semibold">Odak</span>
        </div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
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
        {isAdminPreviewing && (
          <div className="flex items-center justify-between bg-amber-50 px-6 py-2 text-sm text-amber-800">
            <span>Bu paneli admin olarak önizliyorsun.</span>
            <Link href="/admin" className="font-medium underline">
              Admin paneline dön
            </Link>
          </div>
        )}
        <main className="flex-1 bg-slate-50 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
