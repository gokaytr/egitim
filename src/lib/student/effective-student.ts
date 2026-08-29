import { createClient } from "@/lib/supabase/server";

// Ogrenci panelini admin onizlerken "ben" (auth.uid()) admin'in kendisi
// oluyor - bu da butun "benim" sorgularinin (notlarim, denemelerim, vb.)
// bos donmesine yol aciyordu. Bu yardimci, admin icin hangi test ogrencinin
// onizlendigini (?studentId= parametresiyle secilebilir) cozumleyip gercek
// ogrenciler icin ise kendi id'sini donduruyor.
//
// Aday listesi bilinclii olarak sadece is_demo=true ogrencilerle
// sinirlandirildi: gercek ogrenci sayisi buyuk olabilecegi ve gizlilik
// acisindan admin'in tum gercek ogrencileri tek tek "girip" gormesi
// istenmedigi icin. Sinif sinif kontrol amaci test ogrencileriyle zaten
// karsilaniyor.

export type StudentCandidate = { id: string; full_name: string; grade_level: number | null };

export type EffectiveStudent = {
  studentId: string | undefined;
  isAdminPreview: boolean;
  candidates: StudentCandidate[];
};

export async function resolveEffectiveStudent(requestedStudentId?: string): Promise<EffectiveStudent> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user?.id)
    .single();

  if (callerProfile?.role === "admin") {
    const { data: students } = await supabase
      .from("profiles")
      .select("id, full_name, grade_level")
      .eq("role", "student")
      .eq("is_demo", true)
      .order("grade_level");
    const candidates = (students ?? []) as StudentCandidate[];
    const studentId =
      (requestedStudentId && candidates.some((c) => c.id === requestedStudentId) ? requestedStudentId : candidates[0]?.id) ??
      undefined;
    return { studentId, isAdminPreview: true, candidates };
  }

  return { studentId: userData.user?.id, isAdminPreview: false, candidates: [] };
}
