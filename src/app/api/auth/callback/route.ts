import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  teacher: "/ogretmen",
  student: "/ogrenci",
  parent: "/ogrenci/rapor",
};

// Google (ve ileride eklenebilecek diğer OAuth sağlayıcıları) girişinden dönen
// kullanıcıyı oturuma çevirir ve rolüne göre kendi paneline yönlendirir.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const target = ROLE_HOME[profile?.role ?? "student"] ?? "/ogrenci";
      return NextResponse.redirect(`${origin}${target}`);
    }
  }

  return NextResponse.redirect(`${origin}/giris?error=oauth`);
}
