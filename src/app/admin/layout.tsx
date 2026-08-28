import { RoleShell } from "@/components/role-shell";

const NAV = [
  { href: "/admin", label: "Genel Bakış" },
  { href: "/admin/kullanicilar", label: "Kullanıcılar" },
  { href: "/admin/veli-baglantilari", label: "Veli Bağlantıları" },
  { href: "/admin/ogretmen-basvurulari", label: "Öğretmen Başvuruları" },
  { href: "/admin/mufredat", label: "Müfredat / Konu Ekle" },
  { href: "/admin/sorular", label: "Soru Onayı" },
  { href: "/admin/soru-ekle", label: "Soru Ekle" },
  { href: "/admin/genel-ayarlar", label: "Genel Ayarlar" },
  { href: "/admin/onizleme", label: "Önizleme" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell title="Yönetici Paneli" navItems={NAV} helpHref="/admin/sistem-bilgisi">
      {children}
    </RoleShell>
  );
}
