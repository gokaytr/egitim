import { RoleShell } from "@/components/role-shell";

const NAV = [
  { href: "/ogretmen", label: "Genel Bakış" },
  { href: "/ogretmen/konu-anlatim", label: "Konu Anlatımı" },
  { href: "/ogretmen/soru-ekle", label: "Soru Ekle / AI Üret" },
  { href: "/ogretmen/ozel-ders", label: "Özel Ders" },
  { href: "/ogretmen/nasil-calisir", label: "Nasıl Çalışır?" },
];

export default function OgretmenLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell title="Öğretmen Paneli" navItems={NAV}>
      {children}
    </RoleShell>
  );
}
