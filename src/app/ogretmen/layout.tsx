import { createClient } from "@/lib/supabase/server";
import { RoleShell } from "@/components/role-shell";

export default async function OgretmenLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: subjectRows } = await supabase
    .from("teacher_subjects")
    .select("subject_id")
    .eq("teacher_id", userData.user?.id ?? "");
  const subjectIds = (subjectRows ?? []).map((r) => r.subject_id);

  let pendingCount = 0;
  if (subjectIds.length > 0) {
    const { count } = await supabase
      .from("questions")
      .select("id, topics!inner(subject_id)", { count: "exact", head: true })
      .eq("is_approved", false)
      .in("topics.subject_id", subjectIds);
    pendingCount = count ?? 0;
  }

  const NAV = [
    { href: "/ogretmen", label: "Genel Bakış" },
    { href: "/ogretmen/mufredat", label: "Müfredat / Konu Ekle" },
    { href: "/ogretmen/konu-anlatim", label: "Konu Anlatımı" },
    { href: "/ogretmen/sorular", label: "Sorular", tone: "emerald" as const, dot: pendingCount > 0 },
    { href: "/ogretmen/ozel-ders", label: "Özel Ders" },
    { href: "/ogretmen/ogrenci-raporlari", label: "Öğrenci Raporları" },
    { href: "/ogretmen/genel-ayarlar", label: "Genel Ayarlar" },
  ];

  return (
    <RoleShell title="Öğretmen Paneli" navItems={NAV}>
      {children}
    </RoleShell>
  );
}
