import { createClient } from "@/lib/supabase/server";
import { getShowDemoData } from "@/lib/site-settings";

// Ogretmen panelini admin onizlerken "ben" (auth.uid()) admin'in kendisi
// oluyor - bu da butun "benim" sorgularinin (branslarim, derslerim, vb.)
// bos donmesine yol aciyordu. Bu yardimci, admin icin hangi demo ogretmenin
// onizlendigini (?teacherId= parametresiyle secilebilir) cozumleyip gercek
// ogretmenler icin ise kendi id'sini donduruyor.

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
    const teacherId =
      (requestedTeacherId && candidates.some((c) => c.id === requestedTeacherId) ? requestedTeacherId : candidates[0]?.id) ??
      undefined;
    return { teacherId, isAdminPreview: true, candidates };
  }

  return { teacherId: userData.user?.id, isAdminPreview: false, candidates: [] };
}
