import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Ogrencinin "Genel Ayarlar > Sinav Ayarlari" formundan gonderdigi soru basi
// sure siniri ve gosterim bicimi tercihini kendi student_quiz_settings
// satirina yazar (RLS geregi sadece kendi satirini yazabilir).
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

  if (!Number.isFinite(secondsPerQuestion) || secondsPerQuestion < 10 || secondsPerQuestion > 3600) {
    return NextResponse.json({ error: "Soru başı süre 10 saniye ile 60 dakika arasında olmalı." }, { status: 400 });
  }

  const { error } = await supabase.from("student_quiz_settings").upsert({
    student_id: userData.user.id,
    timer_enabled: timerEnabled,
    seconds_per_question: Math.round(secondsPerQuestion),
    one_question_per_page: oneQuestionPerPage,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
