import { RoleShell } from "@/components/role-shell";

const NAV_STUDENT = [{ href: "/ogrenci", label: "Genel Bakış" }];
const NAV_PARENT: { href: string; label: string }[] = [];

export default function OgrenciLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell
      title="Öğrenci Paneli"
      navItems={NAV_STUDENT}
      helpHref="/ogrenci/nasil-calisir"
      titleByRole={{ parent: "Veli Paneli", student: "Öğrenci Paneli" }}
      navItemsByRole={{ parent: NAV_PARENT, student: NAV_STUDENT, admin: NAV_STUDENT }}
    >
      {children}
    </RoleShell>
  );
}
