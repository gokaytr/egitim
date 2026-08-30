import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getShowDemoData } from "@/lib/site-settings";
import { resolveEffectiveStudent } from "@/lib/student/effective-student";

// Ogretmen panelini admin onizlerken "ben" (auth.uid()) admin'in kendisi
// oluyor - bu da butun "benim" sorgularinin (branslarim, derslerim, vb.)
// bos donmesine yol aciyordu. Bu yardimci, admin icin hangi demo ogretmenin
// onizlendigini cozumleyip gercek ogretmenler icin ise kendi id'sini
// donduruyor.
//
// Secim once ?teacherId= query param'indan, o yoksa "admin_preview_teacher_id"
// cookie'sinden okunuyor (sol menudeki ogretmen seciciyi degistirince bu
// cookie /api/admin/preview-teacher uzerinden yaziliyor) - boylece admin bir
// test ogretmeni secip baska bir sayfaya gectiginde secim korunuyor.
//
// Hicbir acik secim (ne query param ne cookie) yoksa - yani admin panelini
// ilk kez aciyorsa - rastgele/alfabetik bir ogretmen yerine, su an onizlenen
// test ogrencinin GERCEKTEN bagli oldugu sorumlu ogretmeni (teacher_students)
// varsayilan olarak gosteriyoruz. Boylece admin ogrenci panelinden ogretmen
// paneline gectiginde ayni "aile" (ogrenci + veli + ogretmen) tutarli kalip
// test edilebiliyor. Ogrencinin bagli bir ogretmeni yoksa (pakete gore
// opsiyonel) normal alfabetik varsayilana dusuluyor.

export type TeacherCandidate = { id: string; full_name: string };
type TeacherCandidateRow = TeacherCandidate & { is_demo: boolean };

export type EffectiveTeacher = {
  teacherId: string | undefined;
  isAdminPreview: boolean;
  candidates: TeacherCandidate[];
};

export async function resolveEffectiveTeacher(requestedTeacherId?: string): Promise<EffectiveTeacher> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user?.id)
    .single();

  if (callerProfile?.role === "admin") {
    const { data: teachers } = await supabase
      .from("profiles")
      .select("id, full_name, is_demo")
      .eq("role", "teacher")
      .order("full_name");
    const showDemoData = await getShowDemoData();
    const allTeachers = (teachers ?? []) as TeacherCandidateRow[];
    const candidates: TeacherCandidate[] = showDemoData ? allTeachers : allTeachers.filter((t) => !t.is_demo);

    const cookieStore = await cookies();
    const cookieTeacherId = cookieStore.get("admin_preview_teacher_id")?.value;
    let preferredId = requestedTeacherId ?? cookieTeacherId;

    if (!preferredId) {
      const { studentId: previewedStudentId } = await resolveEffectiveStudent();
      if (previewedStudentId) {
        const { data: assignments } = await supabase
          .from("teacher_students")
          .select("teacher_id")
          .eq("student_id", previewedStudentId)
          .limit(1);
        if (assignments?.[0]?.teacher_id) preferredId = assignments[0].teacher_id;
      }
    }

    const teacherId =
      (preferredId && candidates.some((c) => c.id === preferredId) ? preferredId : candidates[0]?.id) ?? undefined;
    return { teacherId, isAdminPreview: true, candidates };
  }

  return { teacherId: userData.user?.id, isAdminPreview: false, candidates: [] };
}
