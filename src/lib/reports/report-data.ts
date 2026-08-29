import { createClient } from "@/lib/supabase/server";
import {
  buildAttemptEvent,
  buildContentViewEvent,
  buildDiagnosisEvent,
  buildReferralEvent,
  sortEventsDesc,
  groupEventsByDay,
  type ActivityEvent,
} from "@/lib/reports/activity-feed";
import { buildOverviewSummary } from "@/lib/reports/overview-summary";
import { getShowDemoData } from "@/lib/site-settings";

// Veli raporlama ekraninin ("Genel Bakis" / "Gunluk Aktivite" / "Genel
// Raporlama" - artik ayri sayfalar) ortak veri yukleyicisi. Ucu sayfa da
// ayni cagriyi yapip kendi ilgilendigi kismi kullaniyor; boylece
// ogrenci/rol cozumleme, erisim kontrolu ve sorgu mantigi tek yerde.

export function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export type ReportCandidate = { id: string; full_name: string; is_demo: boolean };

export type StudentReportCore = {
  studentId: string;
  studentProfile: { full_name: string; grade_level: number | null; exam_target: string | null } | null;
  overallLabel: string;
  overallTone: "green" | "amber" | "red";
  totalSolved: number;
  totalCorrect: number;
  totalWrong: number;
  totalEmpty: number;
  accuracy: number | null;
  distinctContentViewed: number;
  targetQuestionsRemaining: number;
  attempts: {
    id: string;
    started_at: string;
    finished_at: string | null;
    total_questions: number | null;
    correct_count: number | null;
    wrong_count: number | null;
    empty_count: number | null;
    topics: { name: string } | { name: string }[] | null;
  }[];
  referrals: {
    id: string;
    status: string;
    requested_at: string;
    topics: { name: string } | { name: string }[] | null;
    tutor_sessions: {
      id: string;
      scheduled_at: string | null;
      duration_minutes: number | null;
      meeting_link: string | null;
      status: string;
    }[] | null;
  }[];
  planItems: {
    id: string;
    status: string;
    source: string;
    target_minutes: number | null;
    target_questions: number | null;
    topics: { id: string; name: string } | { id: string; name: string }[] | null;
  }[];
  diagnoses: {
    id: string;
    ai_summary: string;
    common_error_pattern: string | null;
    weakness_level: string;
    recommended_action: string;
    created_at: string;
    acknowledged_at: string | null;
    topics: { name: string } | { name: string }[] | null;
  }[];
  views: {
    id: string;
    viewed_at: string;
    lesson_contents: { title: string; topics: { name: string } | { name: string }[] | null } | { title: string; topics: { name: string } | { name: string }[] | null }[] | null;
  }[];
  events: ActivityEvent[];
  lastActivity: ActivityEvent | undefined;
  dailyGroups: ReturnType<typeof groupEventsByDay>;
  overviewParagraphs: string[];
};

export type ReportData = StudentReportCore & {
  role: string | undefined;
  pageTitle: string;
  candidates: ReportCandidate[];
  showAddChild: boolean;
};

export type ReportNeedsSetup = {
  needsSetup: true;
  role: string | undefined;
  pageTitle: string;
};

// Belirli bir ogrencinin butun rapor verisini (calisma programi, gecmis
// sinav/test sonuclari, izleme gecmisi, eksik analizleri, aktivite akisi)
// cekip hesapliyor. Kim gorebilir sorusuna karismiyor - onu cagiran taraf
// (loadReportData / loadStaffStudentReport) RLS + kendi erisim mantigiyla
// cozuyor.
export async function loadStudentReportCore(studentId: string): Promise<StudentReportCore> {
  const supabase = await createClient();

  const [
    { data: studentProfile },
    { data: attempts },
    { data: diagnoses },
    { data: planItems },
    { data: referrals },
    { data: views },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, grade_level, exam_target").eq("id", studentId).single(),
    supabase
      .from("student_attempts")
      .select("id, started_at, finished_at, total_questions, correct_count, wrong_count, empty_count, topics(name)")
      .eq("student_id", studentId)
      .order("started_at", { ascending: false }),
    supabase
      .from("diagnoses")
      .select("id, ai_summary, common_error_pattern, weakness_level, recommended_action, created_at, acknowledged_at, topics(name)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("study_plan_items")
      .select("id, status, source, target_minutes, target_questions, topics(id, name), study_plans!inner(student_id, status)")
      .eq("study_plans.student_id", studentId),
    supabase
      .from("tutor_referrals")
      .select("id, status, requested_at, topics(name), tutor_sessions(id, scheduled_at, duration_minutes, meeting_link, status)")
      .eq("student_id", studentId)
      .order("requested_at", { ascending: false }),
    supabase
      .from("lesson_content_views")
      .select("id, viewed_at, lesson_contents(title, topics(name))")
      .eq("student_id", studentId)
      .order("viewed_at", { ascending: false }),
  ]);

  const totalSolved = (attempts ?? []).reduce((sum, a) => sum + (a.total_questions ?? 0), 0);
  const totalCorrect = (attempts ?? []).reduce((sum, a) => sum + (a.correct_count ?? 0), 0);
  const totalWrong = (attempts ?? []).reduce((sum, a) => sum + (a.wrong_count ?? 0), 0);
  const totalEmpty = (attempts ?? []).reduce((sum, a) => sum + (a.empty_count ?? 0), 0);
  const accuracy = totalCorrect + totalWrong > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : null;
  const distinctContentViewed = new Set((views ?? []).map((v) => v.id)).size;
  const targetQuestionsRemaining = (planItems ?? [])
    .filter((p) => p.status !== "done")
    .reduce((sum, p) => sum + (p.target_questions ?? 0), 0);
  const pendingReferrals = (referrals ?? []).filter((r) => r.status === "pending" || r.status === "matched");

  let overallLabel = "Henüz veri yok";
  let overallTone: "green" | "amber" | "red" = "amber";
  if (pendingReferrals.length > 0) {
    overallLabel = "Özel ders desteği bekleniyor";
    overallTone = "red";
  } else if (accuracy !== null) {
    if (accuracy >= 75) {
      overallLabel = "İyi gidiyor";
      overallTone = "green";
    } else if (accuracy >= 50) {
      overallLabel = "Takip gerekiyor";
      overallTone = "amber";
    } else {
      overallLabel = "Acil destek gerekiyor";
      overallTone = "red";
    }
  }

  const events: ActivityEvent[] = [];
  for (const a of attempts ?? []) {
    const topic = firstOf(a.topics);
    events.push(
      buildAttemptEvent({
        id: a.id,
        topicName: topic?.name ?? "Genel",
        finished_at: a.finished_at,
        started_at: a.started_at,
        correct_count: a.correct_count,
        wrong_count: a.wrong_count,
        empty_count: a.empty_count,
      })
    );
  }
  for (const v of views ?? []) {
    const content = firstOf(v.lesson_contents);
    const topic = firstOf(content?.topics);
    events.push(
      buildContentViewEvent({
        id: v.id,
        topicName: topic?.name ?? "Genel",
        contentTitle: content?.title ?? "Konu Anlatımı",
        viewed_at: v.viewed_at,
      })
    );
  }
  for (const d of diagnoses ?? []) {
    const topic = firstOf(d.topics);
    events.push(
      buildDiagnosisEvent({
        id: d.id,
        topicName: topic?.name ?? "Genel",
        weakness_level: d.weakness_level,
        created_at: d.created_at,
      })
    );
  }
  for (const r of referrals ?? []) {
    const topic = firstOf(r.topics);
    events.push(
      buildReferralEvent({
        id: r.id,
        topicName: topic?.name ?? "Genel",
        requested_at: r.requested_at,
      })
    );
  }

  const sortedEvents = sortEventsDesc(events);
  const lastActivity = sortedEvents[0];
  const dailyGroups = groupEventsByDay(events);

  const weakTopicNames = Array.from(
    new Set(
      (diagnoses ?? [])
        .filter((d) => d.weakness_level === "major")
        .map((d) => firstOf(d.topics)?.name)
        .filter((n): n is string => !!n)
    )
  ).slice(0, 5);

  const overviewParagraphs = buildOverviewSummary({
    studentFirstName: studentProfile?.full_name?.split(" ")[0] ?? "Öğrenci",
    totalSolved,
    totalCorrect,
    totalWrong,
    totalEmpty,
    accuracy,
    distinctContentViewed,
    weakTopicNames,
    latestCommonErrorPattern: diagnoses?.[0]?.common_error_pattern,
    pendingReferralTopics: pendingReferrals.map((r) => firstOf(r.topics)?.name).filter((n): n is string => !!n),
  });

  return {
    studentId,
    studentProfile,
    overallLabel,
    overallTone,
    totalSolved,
    totalCorrect,
    totalWrong,
    totalEmpty,
    accuracy,
    distinctContentViewed,
    targetQuestionsRemaining,
    attempts: attempts ?? [],
    referrals: referrals ?? [],
    planItems: planItems ?? [],
    diagnoses: diagnoses ?? [],
    views: views ?? [],
    events,
    lastActivity,
    dailyGroups,
    overviewParagraphs,
  };
}

export async function loadReportData(requestedStudentId?: string): Promise<ReportData | ReportNeedsSetup> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user?.id)
    .single();

  const role = callerProfile?.role;

  let candidates: ReportCandidate[] = [];
  let pageTitle = "İlerleme Raporu";
  let showAddChild = false;

  if (role === "parent" || role === "admin") {
    // Admin de veli onizlemesinde artik tum ogrenci listesinden serbestce
    // secim yapmiyor - gercek bir veli gibi, admin panelinden kendisine
    // baglanmis ogrenci(ler)in verisini goruyor (parent_student_links).
    // (Admin'in TUM ogrencileri gorebildigi genel raporlama ekrani ayri:
    // loadStaffStudentReport / /admin/ogrenci-raporlari.)
    const { data: links } = await supabase
      .from("parent_student_links")
      .select("student_id, profiles!parent_student_links_student_id_fkey(id, full_name, is_demo)")
      .eq("parent_id", userData.user?.id);
    candidates = (links ?? [])
      .map((l) => (Array.isArray(l.profiles) ? l.profiles[0] : l.profiles))
      .filter((p): p is ReportCandidate => !!p);
    const showDemoDataParent = await getShowDemoData();
    candidates = showDemoDataParent ? candidates : candidates.filter((c) => !c.is_demo);
    pageTitle = role === "admin" ? "Veli Görünümü (Admin Önizleme)" : "Veli Raporu";
    showAddChild = role === "parent";
  }

  const studentId =
    (requestedStudentId && candidates.some((c) => c.id === requestedStudentId) ? requestedStudentId : candidates[0]?.id) ??
    (role === "parent" || role === "admin" ? undefined : userData.user?.id);

  if ((role === "parent" || role === "admin") && !studentId) {
    return { needsSetup: true, role, pageTitle };
  }

  const core = await loadStudentReportCore(studentId as string);

  return {
    ...core,
    role,
    pageTitle,
    candidates,
    showAddChild,
  };
}

export type StaffStudentListItem = { id: string; full_name: string; grade_level: number | null; exam_target: string | null; is_demo: boolean };

// Admin "Ogrenci Raporlari" ekraninin liste gorunumu icin - binlerce
// ogrenci olsa bile her biri icin tam rapor sorgusu calistirmadan, sadece
// listede gosterilecek birkac alani cekiyor. Detay (tam rapor) ayri bir
// tiklamayla loadStaffStudentReport uzerinden yukleniyor.
export async function loadStaffStudentList(): Promise<{ role: string | undefined; students: StaffStudentListItem[] }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user?.id)
    .single();

  let students: StaffStudentListItem[] = [];

  if (callerProfile?.role === "teacher") {
    const { data: assigned } = await supabase
      .from("teacher_students")
      .select("profiles!teacher_students_student_id_fkey(id, full_name, grade_level, exam_target, is_demo)")
      .eq("teacher_id", userData.user?.id);
    students = (assigned ?? [])
      .map((row) => (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles))
      .filter((p): p is StaffStudentListItem => !!p)
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "tr"));
  } else {
    const { data: rows } = await supabase
      .from("profiles")
      .select("id, full_name, grade_level, exam_target, is_demo")
      .eq("role", "student")
      .order("full_name");
    students = rows ?? [];
  }

  const showDemoData = await getShowDemoData();
  students = showDemoData ? students : students.filter((s) => !s.is_demo);

  return { role: callerProfile?.role, students };
}

// Admin/ogretmen genel ogrenci raporlari ekrani icin. Admin butun ogrenci
// listesinden serbestce secim yapabiliyor (staff-wide RLS zaten butun
// tablolarda admin/ogretmen/moderator icin acik). Gercek bir ogretmen ise
// SADECE adminin kendisine `teacher_students` tablosuyla atadigi
// ogrencileri gorebiliyor - serbest "tum ogrenciler" listesi yok.
export async function loadStaffStudentReport(requestedStudentId?: string): Promise<ReportData | ReportNeedsSetup> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user?.id)
    .single();

  let candidates: ReportCandidate[] = [];

  if (callerProfile?.role === "teacher") {
    const { data: assigned } = await supabase
      .from("teacher_students")
      .select("profiles!teacher_students_student_id_fkey(id, full_name, is_demo)")
      .eq("teacher_id", userData.user?.id);
    candidates = (assigned ?? [])
      .map((row) => (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles))
      .filter((p): p is ReportCandidate => !!p)
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "tr"));
  } else {
    const { data: students } = await supabase.from("profiles").select("id, full_name, is_demo").eq("role", "student").order("full_name");
    candidates = students ?? [];
  }

  const showDemoDataStaff = await getShowDemoData();
  candidates = showDemoDataStaff ? candidates : candidates.filter((c) => !c.is_demo);

  const pageTitle = "Öğrenci Raporları";

  const studentId = (requestedStudentId && candidates.some((c) => c.id === requestedStudentId) ? requestedStudentId : candidates[0]?.id) ?? undefined;

  if (!studentId) {
    return { needsSetup: true, role: "staff", pageTitle };
  }

  const core = await loadStudentReportCore(studentId);

  return {
    ...core,
    role: "staff",
    pageTitle,
    candidates,
    showAddChild: false,
  };
}
