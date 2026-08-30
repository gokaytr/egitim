import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Ogrencinin "Genel Ayarlar > Sinav Ayarlari" formundan gonderdigi soru basi
// sure siniri ve gosterim bicimi tercihini yazar. Normalde kendi satirina
// yazar; admin bir test ogrenciyi onizlerken formdan o ogrencinin id'si
// (`studentId`) gonderilir - bu durumda admin, ogrencinin panelinde
// gordugunu birebir duzenleyebilsin diye onun adina yazabilir (RLS'de admin
// icin ayrica izin verildi).
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const timerEnabled = !!body?.timerEnabled;
  const secondsPerQuestion = Number(body?.secondsPerQuestion);
  const oneQuestionPerPage = !!body?.oneQuestionPerPage;
  const requestedStudentId = typeof body?.studentId === "string" ? body.studentId : null;

  const FONT_SIZES = ["normal", "large", "xlarge"];
  const FONT_FAMILIES = ["sans", "serif", "mono"];
  const fontSize = FONT_SIZES.includes(body?.fontSize) ? body.fontSize : "large";
  const fontFamily = FONT_FAMILIES.includes(body?.fontFamily) ? body.fontFamily : "sans";

  if (!Number.isFinite(secondsPerQuestion) || secondsPerQuestion < 10 || secondsPerQuestion > 3600) {
    return NextResponse.json({ error: "Soru başı süre 10 saniye ile 60 dakika arasında olmalı." }, { status: 400 });
  }

  let targetStudentId = userData.user.id;
  if (requestedStudentId && requestedStudentId !== userData.user.id) {
    const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
    if (callerProfile?.role !== "admin") {
      return NextResponse.json({ error: "Başka bir öğrencinin ayarlarını değiştiremezsin." }, { status: 403 });
    }
    targetStudentId = requestedStudentId;
  }

  const { error } = await supabase.from("student_quiz_settings").upsert({
    student_id: targetStudentId,
    timer_enabled: timerEnabled,
    seconds_per_question: Math.round(secondsPerQuestion),
    one_question_per_page: oneQuestionPerPage,
    font_size: fontSize,
    font_family: fontFamily,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
