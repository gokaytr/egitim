import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { RoleShell } from "@/components/role-shell";
import { CoachChat } from "@/components/coach-chat";
import { StudentPreviewSwitcher } from "@/components/student-preview-switcher";
import { ChildPreviewSwitcher } from "@/components/child-preview-switcher";
import { resolveEffectiveStudent } from "@/lib/student/effective-student";
import { getShowDemoData } from "@/lib/site-settings";

const NAV_PARENT = [
  { href: "/ogrenci/rapor", label: "Genel Durum" },
  { href: "/ogrenci/rapor/raporlama", label: "Raporlama" },
  { href: "/ogrenci/rapor/ozel-ders-talebi", label: "Özel Ders Talebi" },
];

export default async function OgrenciLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: subjects } = await supabase.from("subjects").select("id, name").order("name");

  // Koc Pusula sohbet balonu SADECE gercek ogrenci girisinde veya admin
  // bir test ogrenciyi onizlerken gorunur - veli onizlemesinde gosterilmez.
  const { data: userData } = await supabase.auth.getUser();
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role, full_name, grade_level")
    .eq("id", userData.user?.id)
    .single();

  // Admin bir test ogrenciyi onizliyorsa (layout'ta query param okunamadigi
  // icin secim cookie'den geliyor - bkz. resolveEffectiveStudent), sol
  // menudeki ilerleme rozetleri ve Koc Pusula da o test ogrencinin verisiyle
  // calissin diye "etkin ogrenci"yi cozumluyoruz.
  const { studentId: effectiveStudentId, isAdminPreview } = await resolveEffectiveStudent();
  const isStudentView = callerProfile?.role === "student" || (callerProfile?.role === "admin" && isAdminPreview);

  const effectiveProfile =
    callerProfile?.role === "admin" && isAdminPreview
      ? (await supabase.from("profiles").select("full_name, grade_level").eq("id", effectiveStudentId).single()).data
      : callerProfile;

  // Sol menudeki her brans icin "cozulen/toplam" ilerleme bilgisi -
  // ogrencinin kendi sinifina ait konu sayisi ve bunlardan tamamlanmis
  // (bitmis) deneme kaydi olanlarin sayisi. Devam eden/yarim kalmis bir
  // deneme henuz sisteme hic kaydedilmiyor (yalnizca "Testi Bitir"de
  // kaydediliyor), o yuzden burada "tamamlanan" disinda hicbir sey
  // "cozuldu" sayilmiyor.
  const totalsBySubject = new Map<string, number>();
  const doneBySubject = new Map<string, number>();
  if (isStudentView && effectiveStudentId && effectiveProfile?.grade_level != null) {
    const [{ data: gradeTopics }, { data: doneAttempts }] = await Promise.all([
      supabase.from("topics").select("id, subject_id").eq("grade_level", effectiveProfile.grade_level),
      supabase
        .from("student_attempts")
        .select("topic_id")
        .eq("student_id", effectiveStudentId)
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
  if (isStudentView && effectiveStudentId) {
    const [{ data: attempts }, { data: pendingItems }] = await Promise.all([
      supabase
        .from("student_attempts")
        .select("correct_count, wrong_count")
        .eq("student_id", effectiveStudentId)
        .order("started_at", { ascending: false })
        .limit(10),
      supabase
        .from("study_plan_items")
        .select("status, topics(name), study_plans!inner(student_id, status)")
        .eq("study_plans.student_id", effectiveStudentId)
        .neq("status", "done")
        .limit(1),
    ]);

    const totalCorrect = (attempts ?? []).reduce((sum, a) => sum + (a.correct_count ?? 0), 0);
    const totalWrong = (attempts ?? []).reduce((sum, a) => sum + (a.wrong_count ?? 0), 0);
    const accuracy = totalCorrect + totalWrong > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : null;

    const pendingItem = pendingItems?.[0];
    const pendingTopic = pendingItem ? (Array.isArray(pendingItem.topics) ? pendingItem.topics[0] : pendingItem.topics) : null;

    coachContext = {
      isim: effectiveProfile?.full_name?.split(" ")[0] ?? "Kahraman",
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
  ];

  // Admin sol menude test ogrenci/test veli secicisini gorsun diye - hangi
  // secicinin gorunecegi RoleShell icinde effectiveRole'e gore belirleniyor.
  let previewSwitcherByRole: { student?: React.ReactNode; parent?: React.ReactNode } | undefined;
  if (callerProfile?.role === "admin") {
    const { studentId: previewStudentId, candidates: studentCandidates } = await resolveEffectiveStudent();

    const { data: childLinks } = await supabase
      .from("parent_student_links")
      .select("student_id, profiles!parent_student_links_student_id_fkey(id, full_name, is_demo)")
      .eq("parent_id", userData.user?.id);
    let childCandidates = (childLinks ?? [])
      .map((l) => (Array.isArray(l.profiles) ? l.profiles[0] : l.profiles))
      .filter((p): p is { id: string; full_name: string; is_demo: boolean } => !!p);
    const showDemoData = await getShowDemoData();
    childCandidates = showDemoData ? childCandidates : childCandidates.filter((c) => !c.is_demo);
    const cookieStore = await cookies();
    const cookieChildId = cookieStore.get("admin_preview_child_id")?.value;
    const currentChildId =
      cookieChildId && childCandidates.some((c) => c.id === cookieChildId) ? cookieChildId : childCandidates[0]?.id;

    previewSwitcherByRole = {
      student: <StudentPreviewSwitcher candidates={studentCandidates} currentId={previewStudentId} />,
      parent: <ChildPreviewSwitcher candidates={childCandidates} currentId={currentChildId} />,
    };
  }

  return (
    <RoleShell
      title="Öğrenci Paneli"
      navItems={navStudent}
      titleByRole={{ parent: "Veli Paneli", student: "Öğrenci Paneli" }}
      navItemsByRole={{ parent: NAV_PARENT, student: navStudent, admin: navStudent }}
      previewSwitcherByRole={previewSwitcherByRole}
      showGradeBackground
    >
      {children}
      {coachContext && <CoachChat context={coachContext} />}
    </RoleShell>
  );
}
