import { createClient } from "@/lib/supabase/server";
import { RoleShell } from "@/components/role-shell";

const TOP_BAR_LINKS = [
  { href: "/admin/gorevler", label: "Yapılacaklar", tone: "accent" as const },
  { href: "/ogrenci", label: "Öğrenci Ekranı" },
  { href: "/ogretmen", label: "Öğretmen Ekranı" },
  { href: "/ogrenci/rapor", label: "Veli Görünümü" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [{ count: pendingCount }, { count: pendingTeacherCount }] = await Promise.all([
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_approved", false),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("teacher_pending", true),
  ]);

  const NAV = [
    { href: "/admin", label: "Genel Bakış" },
    { href: "/admin/kullanicilar", label: "Kullanıcılar" },
    { href: "/admin/ogretmen-basvurulari", label: "Öğretmen Başvuruları", dot: (pendingTeacherCount ?? 0) > 0 },
    { href: "/admin/mufredat", label: "Müfredat / Konu Ekle" },
    { href: "/admin/sorular", label: "Soru Onayı", tone: "amber" as const, dot: (pendingCount ?? 0) > 0 },
    { href: "/admin/soru-ekle", label: "Soru Ekle", tone: "emerald" as const },
    { href: "/admin/ogrenci-raporlari", label: "Öğrenci Raporları" },
    { href: "/admin/ogretmen-aktivite", label: "Öğretmen Aktivitesi" },
    { href: "/admin/istatistikler", label: "İstatistikler" },
    { href: "/admin/genel-ayarlar", label: "Genel Ayarlar" },
  ];

  return (
    <RoleShell title="Yönetici Paneli" navItems={NAV} helpHref="/admin/sistem-bilgisi" topBarLinks={TOP_BAR_LINKS}>
      {children}
    </RoleShell>
  );
}
