import { RoleShell } from "@/components/role-shell";
import { TeacherSwitcher } from "@/components/teacher-switcher";
import { resolveEffectiveTeacher } from "@/lib/teacher/effective-teacher";

export default async function OgretmenLayout({ children }: { children: React.ReactNode }) {
  const { teacherId: effectiveTeacherId, isAdminPreview, candidates } = await resolveEffectiveTeacher();

  // Admin panelindeki "Sorular" ile birebir ayni yapi: ilk menu girdisi
  // dogrudan konu secici + kartlar/son sorular sekmelerine goturuyor (bkz.
  // ogretmen/page.tsx), bu yuzden etiket de admin'deki gibi "Sorular".
  const NAV = [
    { href: "/ogretmen", label: "Sorular" },
    { href: "/ogretmen/mufredat", label: "Müfredat / Konu Ekle" },
    { href: "/ogretmen/konu-anlatim", label: "Konu Anlatımı" },
    { href: "/ogretmen/ozel-ders", label: "Özel Ders" },
    { href: "/ogretmen/ogrenci-raporlari", label: "Öğrenci Raporları" },
    { href: "/ogretmen/istatistikler", label: "İstatistikler" },
  ];

  return (
    <RoleShell
      title="Öğretmen Paneli"
      navItems={NAV}
      previewSwitcher={
        isAdminPreview ? <TeacherSwitcher candidates={candidates} currentId={effectiveTeacherId} /> : undefined
      }
    >
      {children}
    </RoleShell>
  );
}
