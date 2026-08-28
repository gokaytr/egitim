import { createClient } from "@/lib/supabase/server";
import { RoleShell } from "@/components/role-shell";
import { CoachChat } from "@/components/coach-chat";

const NAV_PARENT = [
  { href: "/ogrenci/rapor", label: "Genel Durum" },
  { href: "/ogrenci/rapor/raporlama", label: "Raporlama" },
  { href: "/ogrenci/rapor/ozel-ders-talebi", label: "Özel Ders Talebi" },
];

export default async function OgrenciLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: subjects } = await supabase.from("subjects").select("id, name").order("name");

  // Koc Pusula sohbet balonu SADECE gercek ogrenci girisinde gorunur - veli
  // onizlemesinde veya admin onizlemesinde gosterilmez.
  const { data: userData } = await supabase.auth.getUser();
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", userData.user?.id)
    .single();

  let coachContext: { isim: string; konu: string; basari: string } | null = null;
  if (callerProfile?.role === "student" && userData.user) {
    const [{ data: attempts }, { data: pendingItems }] = await Promise.all([
      supabase
        .from("student_attempts")
        .select("correct_count, wrong_count")
        .eq("student_id", userData.user.id)
        .order("started_at", { ascending: false })
        .limit(10),
      supabase
        .from("study_plan_items")
        .select("status, topics(name), study_plans!inner(student_id, status)")
        .eq("study_plans.student_id", userData.user.id)
        .neq("status", "done")
        .limit(1),
    ]);

    const totalCorrect = (attempts ?? []).reduce((sum, a) => sum + (a.correct_count ?? 0), 0);
    const totalWrong = (attempts ?? []).reduce((sum, a) => sum + (a.wrong_count ?? 0), 0);
    const accuracy = totalCorrect + totalWrong > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : null;

    const pendingItem = pendingItems?.[0];
    const pendingTopic = pendingItem ? (Array.isArray(pendingItem.topics) ? pendingItem.topics[0] : pendingItem.topics) : null;

    coachContext = {
      isim: callerProfile.full_name?.split(" ")[0] ?? "Kahraman",
      konu: pendingTopic?.name ?? "-",
      basari: accuracy !== null ? String(accuracy) : "-",
    };
  }

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
      {coachContext && <CoachChat context={coachContext} />}
    </RoleShell>
  );
}
