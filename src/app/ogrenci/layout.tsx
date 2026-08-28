import { createClient } from "@/lib/supabase/server";
import { RoleShell } from "@/components/role-shell";

const NAV_PARENT = [
  { href: "/ogrenci/rapor", label: "Genel Durum" },
  { href: "/ogrenci/rapor/raporlama", label: "Raporlama" },
  { href: "/ogrenci/rapor/ozel-ders-talebi", label: "Özel Ders Talebi" },
];

export default async function OgrenciLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: subjects } = await supabase.from("subjects").select("id, name").order("name");

  // Dersler artik dashboard'da tiklanacak kartlar degil, soldaki sekmelerde
  // dogrudan gorunuyor.
  const navStudent = [
    { href: "/ogrenci", label: "Genel Bakış" },
    ...(subjects ?? []).map((s) => ({ href: `/ogrenci/ders/${s.id}`, label: s.name })),
  ];

  return (
    <RoleShell
      title="Öğrenci Paneli"
      navItems={navStudent}
      helpHref="/ogrenci/nasil-calisir"
      titleByRole={{ parent: "Veli Paneli", student: "Öğrenci Paneli" }}
      navItemsByRole={{ parent: NAV_PARENT, student: navStudent, admin: navStudent }}
      showGradeBackground
    >
      {children}
    </RoleShell>
  );
}
