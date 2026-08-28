import { RoleShell } from "@/components/role-shell";

const NAV = [
  { href: "/admin", label: "Genel Bakış" },
  { href: "/admin/kullanicilar", label: "Kullanıcılar" },
  { href: "/admin/veli-baglantilari", label: "Veli Bağlantıları" },
  { href: "/admin/ogretmen-basvurulari", label: "Öğretmen Başvuruları" },
  { href: "/admin/mufredat", label: "Müfredat" },
  { href: "/admin/sorular", label: "Soru Onayı" },
  { href: "/admin/soru-ekle", label: "Soru Ekle" },
  { href: "/admin/sistem-bilgisi", label: "Sistem Bilgisi" },
  { href: "/ogrenci", label: "Üye Ekranı (önizleme)" },
  { href: "/ogretmen", label: "Öğretmen Ekranı (önizleme)" },
  { href: "/ogrenci/rapor", label: "Veli Görünümü (önizleme)" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell title="Yönetici Paneli" navItems={NAV}>
      {children}
    </RoleShell>
  );
}
