import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Ogrenci panelini admin onizlerken "ben" (auth.uid()) admin'in kendisi
// oluyor - bu da butun "benim" sorgularinin (notlarim, denemelerim, sinif
// duzeyim vb.) bos donmesine yol aciyordu. Bu yardimci, admin icin hangi
// test ogrencinin onizlendigini cozumleyip gercek ogrenciler icin ise
// kendi id'sini donduruyor.
//
// Secim once ?studentId= query param'indan, o yoksa "admin_preview_student_id"
// cookie'sinden okunuyor (StudentPreviewSwitcher secim degistiginde bu
// cookie'yi /api/admin/preview-student uzerinden yaziyor). Boylece admin
// bir test ogrenciyi secip sol menuden baska bir derse gectiginde -
// URL'de ayrica ?studentId= tasimaya gerek kalmadan - secim korunuyor.
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

    const cookieStore = await cookies();
    const cookieStudentId = cookieStore.get("admin_preview_student_id")?.value;
    const preferredId = requestedStudentId ?? cookieStudentId;

    const studentId =
      (preferredId && candidates.some((c) => c.id === preferredId) ? preferredId : candidates[0]?.id) ?? undefined;
    return { studentId, isAdminPreview: true, candidates };
  }

  return { studentId: userData.user?.id, isAdminPreview: false, candidates: [] };
}
