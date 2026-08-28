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
];

const PREVIEW_LINKS = [
  { href: "/ogrenci", label: "Öğrenci Ekranı" },
  { href: "/ogretmen", label: "Öğretmen Ekranı" },
  { href: "/ogrenci/rapor", label: "Veli Görünümü" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell title="Yönetici Paneli" navItems={NAV} helpHref="/admin/sistem-bilgisi" topBarLinks={PREVIEW_LINKS}>
      {children}
    </RoleShell>
  );
}
