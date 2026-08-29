import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// preview-student route'unun veli karsiligi: admin sol menudeki "Test Veli"
// seciciden (kendisine baglanmis test ogrencilerden biri) bir cocuk
// sectiginde cagrilir, secim bir cookie'ye yazilir - boylece admin veli
// gorunumunde baska bir sayfaya gectiginde secim hatirlanir.
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

  const { data: link } = await supabase
    .from("parent_student_links")
    .select("student_id")
    .eq("parent_id", userData.user.id)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!link) {
    return NextResponse.json({ error: "Geçersiz test veli çocuğu." }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_preview_child_id", studentId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  return res;
}
