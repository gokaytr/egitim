import { RoleShell } from "@/components/role-shell";

const NAV = [
  { href: "/ogrenci", label: "Genel Bakış" },
  { href: "/ogrenci/rapor", label: "İlerleme Raporu" },
];

export default function OgrenciLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell title="Öğrenci Paneli" navItems={NAV}>
      {children}
    </RoleShell>
  );
}
