import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Admin, "Test Ogrenci" onizleme secicisinden bir ogrenci sectiginde bu
// route cagrilir ve secim bir cookie'ye yazilir. Boylece admin sol
// menuden baska bir derse/sayfaya gectiginde (URL'de ?studentId= olmadan)
// bile en son sectigi test ogrenci "hatirlanir" - her linke query param
// eklemek yerine bu daha basit ve saglam bir cozum.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Bu işlem sadece adminler içindir." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const studentId = body?.studentId;
  if (!studentId || typeof studentId !== "string") {
    return NextResponse.json({ error: "studentId gerekli." }, { status: 400 });
  }

  const { data: candidate } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", studentId)
    .eq("role", "student")
    .eq("is_demo", true)
    .single();
  if (!candidate) {
    return NextResponse.json({ error: "Geçersiz test öğrenci." }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_preview_student_id", studentId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  return res;
}
