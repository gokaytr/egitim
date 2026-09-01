import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RoleShell } from "@/components/role-shell";
import { CoachChat } from "@/components/coach-chat";
import { StudentPreviewSwitcher } from "@/components/student-preview-switcher";
import { resolveEffectiveStudent } from "@/lib/student/effective-student";

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
    .select("role, full_name, grade_level, exam_target")
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
      ? (await supabase.from("profiles").select("full_name, grade_level, exam_target").eq("id", effectiveStudentId).single()).data
      : callerProfile;

  // Google ile uye olan ogrencilerde sinif/hedef sinav bilgisi kayit
  // sirasinda alinamadigi icin bos kalabiliyor - bu durumda ogrenci
  // panelinin her ekraninda ustte kalici bir uyari gosterip ayarlara
  // yonlendiriyoruz. Admin bir test ogrenciyi onizlerken de onun bilgisi
  // eksikse ayni uyari gorunur (parite kurali).
  const profileInfoMissing = isStudentView && (effectiveProfile?.grade_level == null || !effectiveProfile?.exam_target);

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
  // dogrudan gorunuyor. "Gecmis Sonuclarim" artik sol menude ayri bir sekme
  // degil - dashboard'daki "Cozulen Test/Deneme" istatistik kartina
  // tiklayinca yeni sekmede aciliyor (bkz. ogrenci/page.tsx).
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

    // Veli onizlemesi artik ayri bir "hangi cocuk" secimi degil - ayni test
    // ogrenci seciciyle (StudentPreviewSwitcher) ayni ogrenciyi gosteriyor
    // (bkz. lib/reports/report-data.ts loadReportData, ki artik
    // resolveEffectiveStudent'in sectigi ogrenciyi kullaniyor). Boylece
    // "ilk acilan ogrenci" ile veli onizlemesi her zaman ayni kisiyi
    // gosterir - onceden admin'in kendi hesabina baglanmis (bos) bir
    // parent_student_links kaydi arandigi icin veli onizlemesi hep bos
    // cikiyordu.
    previewSwitcherByRole = {
      student: <StudentPreviewSwitcher candidates={studentCandidates} currentId={previewStudentId} />,
      parent: <StudentPreviewSwitcher candidates={studentCandidates} currentId={previewStudentId} />,
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
      gradeLevel={effectiveProfile?.grade_level}
    >
      {profileInfoMissing && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            Sınıf ve hedef sınav bilgin eksik görünüyor. Sana uygun konu ve soruları gösterebilmemiz için ayarlardan
            bu bilgiyi güncellemelisin.
          </span>
          <Link href="/ogrenci/genel-ayarlar" className="shrink-0 font-semibold text-amber-900 underline">
            Şimdi güncelle →
          </Link>
        </div>
      )}
      {children}
      {coachContext && <CoachChat context={coachContext} />}
    </RoleShell>
  );
}
