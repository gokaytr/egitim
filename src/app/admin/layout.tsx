import { RoleShell } from "@/components/role-shell";

const NAV = [
  { href: "/admin", label: "Genel Bakış" },
  { href: "/admin/kullanicilar", label: "Kullanıcılar" },
  { href: "/admin/ogretmen-basvurulari", label: "Öğretmen Başvuruları" },
  { href: "/admin/mufredat", label: "Müfredat" },
  { href: "/admin/sorular", label: "Soru Onayı" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell title="Yönetici Paneli" navItems={NAV}>
      {children}
    </RoleShell>
  );
}
