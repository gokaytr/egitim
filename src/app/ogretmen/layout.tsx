import { RoleShell } from "@/components/role-shell";
import { TeacherSwitcher } from "@/components/teacher-switcher";
import { resolveEffectiveTeacher } from "@/lib/teacher/effective-teacher";

export default async function OgretmenLayout({ children }: { children: React.ReactNode }) {
  const { teacherId: effectiveTeacherId, isAdminPreview, candidates } = await resolveEffectiveTeacher();

  // "Sorular" sol menuden kaldirildi - Genel Bakis'taki buyuk "Soru Ekle"/
  // "Soru Onayla" kartlari zaten oraya dogrudan goturuyor (bkz. ogretmen/page.tsx),
  // ayrica bir menu girdisine gerek yok.
  const NAV = [
    { href: "/ogretmen", label: "Genel Bakış" },
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
