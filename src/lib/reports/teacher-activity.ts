import { createClient } from "@/lib/supabase/server";
import { getShowDemoData } from "@/lib/site-settings";

// Admin paneli icin "ogretmenler tek tek ne yapti" raporu. Her ogretmenin
// eklediği soru sayisi, eklediği konu anlatimi sayisi, kendisine atanan
// ogrenci sayisi, branşları ve ozel ders (tutor_referrals) durum dagilimini
// tek bir satirda ozetler - boylece admin butun ogretmenlerin katkisini
// tek ekrandan kiyaslayabilir.

export type TeacherActivityRow = {
  teacherId: string;
  fullName: string;
  email: string | null;
  subjects: string[];
  assignedStudentCount: number;
  questionsAdded: number;
  lessonContentsAdded: number;
  referralsMatched: number;
  referralsCompleted: number;
  referralsPending: number;
  lastActivityAt: string | null;
};

export async function loadTeacherActivityReport(): Promise<TeacherActivityRow[]> {
  const supabase = await createClient();

  const { data: teachers } = await supabase
    .from("profiles")
    .select("id, full_name, email, is_demo")
    .eq("role", "teacher")
    .order("full_name", { ascending: true });

  const showDemoData = await getShowDemoData();
  const visibleTeachers = showDemoData ? (teachers ?? []) : (teachers ?? []).filter((t) => !t.is_demo);

  const teacherIds = visibleTeachers.map((t) => t.id);
  if (teacherIds.length === 0) return [];

  const [
    { data: subjectLinks },
    { data: studentLinks },
    { data: questions },
    { data: lessonContents },
    { data: referrals },
  ] = await Promise.all([
    supabase.from("teacher_subjects").select("teacher_id, subjects(name)").in("teacher_id", teacherIds),
    supabase.from("teacher_students").select("teacher_id, student_id").in("teacher_id", teacherIds),
    supabase.from("questions").select("id, created_by, created_at").in("created_by", teacherIds),
    supabase.from("lesson_contents").select("id, teacher_id, created_at").in("teacher_id", teacherIds),
    supabase.from("tutor_referrals").select("id, tutor_id, status, requested_at").in("tutor_id", teacherIds),
  ]);

  return visibleTeachers.map((t) => {
    const mySubjects = (subjectLinks ?? [])
      .filter((s) => s.teacher_id === t.id)
      .map((s) => {
        const subj = Array.isArray(s.subjects) ? s.subjects[0] : s.subjects;
        return subj?.name;
      })
      .filter((n): n is string => !!n);

    const myStudents = (studentLinks ?? []).filter((s) => s.teacher_id === t.id);
    const myQuestions = (questions ?? []).filter((q) => q.created_by === t.id);
    const myLessonContents = (lessonContents ?? []).filter((c) => c.teacher_id === t.id);
    const myReferrals = (referrals ?? []).filter((r) => r.tutor_id === t.id);

    const timestamps = [
      ...myQuestions.map((q) => q.created_at),
      ...myLessonContents.map((c) => c.created_at),
      ...myReferrals.map((r) => r.requested_at),
    ].filter((v): v is string => !!v);
    const lastActivityAt = timestamps.length
      ? timestamps.reduce((latest, cur) => (new Date(cur) > new Date(latest) ? cur : latest))
      : null;

    return {
      teacherId: t.id,
      fullName: t.full_name,
      email: t.email,
      subjects: mySubjects,
      assignedStudentCount: myStudents.length,
      questionsAdded: myQuestions.length,
      lessonContentsAdded: myLessonContents.length,
      referralsMatched: myReferrals.filter((r) => r.status === "matched" || r.status === "scheduled").length,
      referralsCompleted: myReferrals.filter((r) => r.status === "completed").length,
      referralsPending: myReferrals.filter((r) => r.status === "pending").length,
      lastActivityAt,
    };
  });
}
