import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Veli, kendi cocugunu e-posta adresiyle sisteme baglayabilsin diye.
// Ogrenci profilini bulmak icin admin (service-role) client kullaniyoruz
// cunku RLS normalde bir velinin henuz baglanmadigi bir ogrencinin profilini
// e-posta ile aramasina izin vermiyor - bu route'ta once cagiranin gercekten
// giris yapmis bir "veli" oldugunu dogruluyoruz, sonra guvenli sekilde arama/ekleme yapiyoruz.
export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "E-posta gerekli" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (callerProfile?.role !== "parent") {
    return NextResponse.json({ error: "Bu işlem sadece veli hesapları için geçerli" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: student, error: studentError } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .ilike("email", email.trim())
    .maybeSingle();

  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 500 });
  }
  if (!student) {
    return NextResponse.json({ error: "Bu e-posta ile kayıtlı bir öğrenci bulunamadı." }, { status: 404 });
  }
  if (student.role !== "student") {
    return NextResponse.json({ error: "Bu e-posta bir öğrenci hesabına ait değil." }, { status: 400 });
  }

  const { error: linkError } = await admin
    .from("parent_student_links")
    .insert({ parent_id: userData.user.id, student_id: student.id });

  if (linkError) {
    if (linkError.code === "23505") {
      return NextResponse.json({ error: "Bu öğrenci zaten hesabına bağlı." }, { status: 409 });
    }
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ student: { id: student.id, full_name: student.full_name } });
}
