import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const ALLOWED_ROLES = ["teacher", "student", "parent"] as const;

// Admin'in kayit akisini atlayip dogrudan ogretmen/ogrenci/veli hesabi
// olusturmasi icin kullanilan route. auth.users satiri service-role ile
// olusturuluyor, profiles satirini handle_new_user trigger'i otomatik acar.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = body?.email as string | undefined;
  const password = body?.password as string | undefined;
  const fullName = body?.full_name as string | undefined;
  const role = body?.role as string | undefined;
  const gradeLevel = body?.grade_level as string | undefined;
  const examTarget = body?.exam_target as string | undefined;

  if (!email || !password || !fullName || !role || !ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "Eksik veya geçersiz bilgi." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Şifre en az 6 karakter olmalı." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      grade_level: role === "student" ? gradeLevel ?? "" : "",
      exam_target: role === "student" ? examTarget ?? "" : "",
    },
  });

  if (error || !created.user) {
    return NextResponse.json({ error: error?.message ?? "Kullanıcı oluşturulamadı." }, { status: 400 });
  }

  return NextResponse.json({ id: created.user.id });
}
