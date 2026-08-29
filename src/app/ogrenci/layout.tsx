import { createClient } from "@/lib/supabase/server";
import { RoleShell } from "@/components/role-shell";
import { CoachChat } from "@/components/coach-chat";

const NAV_PARENT = [
  { href: "/ogrenci/rapor", label: "Genel Durum" },
  { href: "/ogrenci/rapor/raporlama", label: "Raporlama" },
  { href: "/ogrenci/rapor/ozel-ders-talebi", label: "Özel Ders Talebi" },
  { href: "/ogrenci/genel-ayarlar", label: "Genel Ayarlar" },
];

export default async function OgrenciLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: subjects } = await supabase.from("subjects").select("id, name").order("name");

  // Koc Pusula sohbet balonu SADECE gercek ogrenci girisinde gorunur - veli
  // onizlemesinde veya admin onizlemesinde gosterilmez.
  const { data: userData } = await supabase.auth.getUser();
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, full_name, grade_level")
    .eq("id", userData.user?.id)
    .single();

  // Sol menudeki her brans icin "cozulen/toplam" ilerleme bilgisi -
  // ogrencinin kendi sinifina ait konu sayisi ve bunlardan tamamlanmis
  // (bitmis) deneme kaydi olanlarin sayisi. Devam eden/yarim kalmis bir
  // deneme henuz sisteme hic kaydedilmiyor (yalnizca "Testi Bitir"de
  // kaydediliyor), o yuzden burada "tamamlanan" disinda hicbir sey
  // "cozuldu" sayilmiyor.
  const totalsBySubject = new Map<string, number>();
  const doneBySubject = new Map<string, number>();
  if (callerProfile?.role === "student" && userData.user && callerProfile.grade_level != null) {
    const [{ data: gradeTopics }, { data: doneAttempts }] = await Promise.all([
      supabase.from("topics").select("id, subject_id").eq("grade_level", callerProfile.grade_level),
      supabase
        .from("student_attempts")
        .select("topic_id")
        .eq("student_id", userData.user.id)
        .not("topic_id", "is", null)
        .not("finished_at", "is", null),
    ]);
    const doneTopicIds = new Set((doneAttempts ?? []).map((a) => a.topic_id));
    for (const t of gradeTopics ?? []) {
      totalsBySubject.set(t.subject_id, (totalsBySubject.get(t.subject_id) ?? 0) + 1);
      if (doneTopicIds.has(t.id)) {
        doneBySubject.set(t.subject_id, (doneBySubject.get(t.subject_id) ?? 0) + 1);
      }
    }
  }

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
    ...(subjects ?? []).map((s) => {
      const total = totalsBySubject.get(s.id) ?? 0;
      return {
        href: `/ogrenci/ders/${s.id}`,
        label: s.name,
        badge: total > 0 ? `${doneBySubject.get(s.id) ?? 0}/${total}` : undefined,
      };
    }),
    { href: "/ogrenci/genel-ayarlar", label: "Genel Ayarlar" },
  ];

  return (
    <RoleShell
      title="Öğrenci Paneli"
      navItems={navStudent}
      titleByRole={{ parent: "Veli Paneli", student: "Öğrenci Paneli" }}
      navItemsByRole={{ parent: NAV_PARENT, student: navStudent, admin: navStudent }}
      showGradeBackground
    >
      {children}
      {coachContext && <CoachChat context={coachContext} />}
    </RoleShell>
  );
}
