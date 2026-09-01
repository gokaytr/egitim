import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { examTargetsForGrade } from "@/lib/exam-targets";

// Ogrencinin "Genel Ayarlar > Profil Bilgileri" formundan sinif duzeyi ve
// hedef sinavini kaydetmesini sagliyor. Ozellikle Google ile uye olan
// ogrencilerde bu bilgiler kayit sirasinda alinamadigi (Google
// metadata'sinda yok) icin profiles.grade_level/exam_target NULL kaliyor -
// bu form/route o eksigi tamamlamanin tek yolu. Admin bir test ogrenciyi
// onizlerken de (quiz-settings route'undaki ayni desen) `studentId`
// gonderilirse admin onun adina yazabiliyor.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const gradeLevel = Number(body?.gradeLevel);
  const examTarget = typeof body?.examTarget === "string" ? body.examTarget : null;
  const requestedStudentId = typeof body?.studentId === "string" ? body.studentId : null;

  if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 12) {
    return NextResponse.json({ error: "Sınıf 1 ile 12 arasında olmalı." }, { status: 400 });
  }
  // Sinav secenegi, secilen sinif icin anlamli olan listeyle sinirli - ör.
  // 5. sinif icin "LGS" ya da 9. sinif icin "KPSS" gonderilirse reddediyoruz.
  if (!examTarget || !examTargetsForGrade(gradeLevel).includes(examTarget)) {
    return NextResponse.json({ error: "Geçerli bir hedef sınav seç." }, { status: 400 });
  }

  let targetStudentId = userData.user.id;
  if (requestedStudentId && requestedStudentId !== userData.user.id) {
    const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
    if (callerProfile?.role !== "admin") {
      return NextResponse.json({ error: "Başka bir öğrencinin bilgilerini değiştiremezsin." }, { status: 403 });
    }
    targetStudentId = requestedStudentId;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ grade_level: gradeLevel, exam_target: examTarget })
    .eq("id", targetStudentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
