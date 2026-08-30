import { createClient } from "@/lib/supabase/server";
import { RoleShell } from "@/components/role-shell";

// Ogrenci/Ogretmen/Veli onizlemesine gecis artik sol menu altindaki "Panel
// değiştir" butonlarindan (RoleShell) yapiliyor - burada sadece admin'in
// kendi paneline ozel "Yapilacaklar" kisayolu kaliyor.
const TOP_BAR_LINKS = [{ href: "/admin/gorevler", label: "Yapılacaklar", tone: "accent" as const }];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [{ count: pendingCount }, { count: pendingTeacherCount }] = await Promise.all([
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_approved", false),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("teacher_pending", true),
  ]);

  const NAV = [
    { href: "/admin", label: "Genel Bakış" },
    { href: "/admin/kullanicilar", label: "Kullanıcılar" },
    { href: "/admin/ogrenci-raporlari", label: "Öğrenci Raporları" },
    { href: "/admin/ogretmen-basvurulari", label: "Öğretmenler", dot: (pendingTeacherCount ?? 0) > 0 },
    { href: "/admin/sorular", label: "Sorular", tone: "emerald" as const, dot: (pendingCount ?? 0) > 0 },
    { href: "/admin/istatistikler", label: "İstatistikler" },
  ];

  return (
    <RoleShell title="Yönetici Paneli" navItems={NAV} topBarLinks={TOP_BAR_LINKS}>
      {children}
    </RoleShell>
  );
}
