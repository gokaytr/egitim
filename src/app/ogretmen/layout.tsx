import { RoleShell } from "@/components/role-shell";

const NAV = [
  { href: "/ogretmen", label: "Genel Bakış" },
  { href: "/ogretmen/mufredat", label: "Müfredat / Konu Ekle" },
  { href: "/ogretmen/konu-anlatim", label: "Konu Anlatımı" },
  { href: "/ogretmen/soru-ekle", label: "Soru Ekle" },
  { href: "/ogretmen/soru-onay", label: "Soru Onayı" },
  { href: "/ogretmen/ozel-ders", label: "Özel Ders" },
  { href: "/ogretmen/nasil-calisir", label: "Nasıl Çalışır?" },
];

export default function OgretmenLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell title="Öğretmen Paneli" navItems={NAV} helpHref="/ogretmen/nasil-calisir">
      {children}
    </RoleShell>
  );
}
