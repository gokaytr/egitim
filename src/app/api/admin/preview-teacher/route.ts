import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// preview-student route'unun ogretmen karsiligi: admin sol menudeki "Test
// Ogretmen" seciciden bir ogretmen sectiginde cagrilir, secim bir cookie'ye
// yazilir - boylece admin baska bir sayfaya gectiginde de en son sectigi
// test ogretmen hatirlanir.
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
  const teacherId = body?.teacherId;
  if (!teacherId || typeof teacherId !== "string") {
    return NextResponse.json({ error: "teacherId gerekli." }, { status: 400 });
  }

  const { data: candidate } = await supabase.from("profiles").select("id").eq("id", teacherId).eq("role", "teacher").single();
  if (!candidate) {
    return NextResponse.json({ error: "Geçersiz test öğretmen." }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_preview_teacher_id", teacherId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  return res;
}
