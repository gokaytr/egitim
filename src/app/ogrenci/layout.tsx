import { RoleShell } from "@/components/role-shell";

const NAV = [
  { href: "/ogrenci", label: "Genel Bakış" },
  { href: "/ogrenci/rapor", label: "Rapor: Genel Durum" },
  { href: "/ogrenci/rapor/gunluk-aktivite", label: "Rapor: Günlük Aktivite" },
  { href: "/ogrenci/rapor/genel-raporlama", label: "Rapor: Genel Raporlama" },
];

export default function OgrenciLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell title="Öğrenci Paneli" navItems={NAV} helpHref="/ogrenci/nasil-calisir">
      {children}
    </RoleShell>
  );
}
